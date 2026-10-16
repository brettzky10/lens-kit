import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { callLocalVideoApi } from "@/lib/localModelClient";
import { VIDEO_MODEL_SLUGS, type VideoGenerationProvider } from "@/lib/providerOptions";

/**
 * Video generation by provider (all via Replicate except "local"):
 *  - veo:      Veo 3.1. 1-2 images = start/end frame; 3 images = reference images (forces 16:9 + 8s).
 *  - seedance: Seedance 2.5. Reference images AND reference videos together.
 *  - flux:     Flux 3. A video reference becomes start_video (exclusive with images). Optional draft mode.
 *  - wan:      Wan 3. Optional first-frame image.
 *  - grok:     Grok Imagine Video 1.5. Image required.
 *  - minimax:  Hailuo 2.3. Optional first-frame image. 1080p is 6s only.
 *  - local:    your own server (lib/localModelClient.ts).
 * Falls back to a sample video when the provider isn't configured or the call fails, and says why.
 */
export async function POST(req: NextRequest) {
  const {
    prompt,
    imageRefs,
    videoRefs,
    duration = "auto",
    resolution = "720p",
    aspectRatio = "auto",
    audio = true,
    draft = false,
    provider = "flux",
  } = await req.json();

  const refImages: string[] = Array.isArray(imageRefs) ? imageRefs : [];
  const refVideos: string[] = Array.isArray(videoRefs) ? videoRefs : [];

  // Relative paths (Shot clips, our own outputs) must be absolute for Replicate. This only works once
  // the app is publicly reachable; Replicate can't fetch your localhost.
  const resolveUrl = (u: string) => (u.startsWith("/") ? new URL(u, req.nextUrl.origin).toString() : u);
  const imgs = refImages.map(resolveUrl);
  const vids = refVideos.map(resolveUrl);

  const secs = parseInt(String(duration), 10);
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

  function placeholder(fallbackReason: string) {
    return NextResponse.json({
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      fallback: true,
      fallbackReason,
    });
  }

  if (provider === "local") {
    try {
      const { url } = await callLocalVideoApi({
        prompt, imageRefs: imgs, videoRefs: vids, duration, resolution, aspectRatio,
      });
      return NextResponse.json({ videoUrl: url, fallback: false });
    } catch (err: any) {
      console.error("Local video model call failed, using placeholder:", err);
      return placeholder(err?.message || String(err));
    }
  }

  const slug = VIDEO_MODEL_SLUGS[provider as Exclude<VideoGenerationProvider, "local">];
  if (!slug) return NextResponse.json({ error: `Unknown video provider "${provider}"` }, { status: 400 });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — serving a placeholder video instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  // Build the model-specific input
  let input: Record<string, unknown>;
  switch (provider as Exclude<VideoGenerationProvider, "local">) {
    case "veo": {
      input = {
        prompt: prompt || "",
        duration: [4, 6, 8].includes(secs) ? secs : 8,
        aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
        resolution: resolution === "720p" ? "720p" : "1080p",
        generate_audio: audio !== false,
      };
      if (imgs.length >= 3) {
        // reference-to-video only works at 16:9 and 8s
        input.reference_images = imgs.slice(0, 3);
        input.aspect_ratio = "16:9";
        input.duration = 8;
      } else {
        if (imgs[0]) input.image = imgs[0];
        if (imgs[1]) input.last_frame = imgs[1];
      }
      break;
    }
    case "seedance": {
      input = {
        prompt: prompt || "",
        duration: Number.isFinite(secs) ? secs : 5, // -1 = model picks
        resolution,
        aspect_ratio: aspectRatio,
        generate_audio: audio !== false,
        watermark: false,
        output_format: "mp4",
      };
      if (imgs.length) input.reference_images = imgs.slice(0, 30);
      if (vids.length) input.reference_videos = vids.slice(0, 10);
      break;
    }
    case "wan": {
      input = {
        prompt: prompt || "",
        duration: clamp(Number.isFinite(secs) ? secs : 5, 2, 30),
        resolution,
        aspect_ratio: aspectRatio,
        enable_prompt_expansion: true,
      };
      if (imgs[0]) input.image = imgs[0];
      break;
    }
    case "grok": {
      if (!imgs[0]) {
        return NextResponse.json({ error: "Grok Imagine Video needs a connected image to animate." }, { status: 400 });
      }
      input = {
        prompt: prompt || "",
        image: imgs[0],
        duration: clamp(Number.isFinite(secs) ? secs : 5, 1, 15),
        resolution,
        aspect_ratio: aspectRatio,
      };
      break;
    }
    case "minimax": {
      // Hailuo 2.3: 10s only at 768p; 1080p is 6s only. No aspect ratio (follows the first frame).
      const res = resolution === "1080p" ? "1080p" : "768p";
      input = {
        prompt: prompt || "",
        duration: res === "768p" && secs === 10 ? 10 : 6,
        resolution: res,
        prompt_optimizer: true,
      };
      if (imgs[0]) input.first_frame_image = imgs[0];
      break;
    }
    default: {
      // flux 3. start_video and images are mutually exclusive; prefer start_video.
      input = {
        draft: !!draft,
        prompt,
        duration,
        resolution: draft ? "720p" : resolution,
        aspect_ratio: aspectRatio,
        generate_audio: audio !== false,
        safety_tolerance: 2,
      };
      if (vids[0]) input.start_video = vids[0];
      else input.images = imgs;
    }
  }

  try {
    const replicate = new Replicate({ auth: token });
    const output = await replicate.run(slug as `${string}/${string}`, { input });
    const videoUrl = extractUrl(output);
    if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");
    return NextResponse.json({ videoUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err, slug);
    console.error(`Replicate ${provider} video generation failed, using placeholder:`, reason, err);
    return placeholder(reason);
  }
}

function describeReplicateError(err: any, slug: string): string {
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return "Replicate rejected the API token (401 Unauthorized) — check REPLICATE_API_TOKEN.";
    if (status === 402) return "Replicate returned 402 Payment Required — billing/credits may need to be set up on your Replicate account.";
    if (status === 404) return `Replicate model not found (404): "${slug}" is a best guess. Check the exact owner/model on replicate.com and update VIDEO_MODEL_SLUGS in lib/providerOptions.ts.`;
    if (status === 422) return `Replicate rejected the request (422): ${err.message}`;
    return `Replicate API error (status ${status}): ${err.message}`;
  }
  return err?.message || String(err);
}

function extractUrl(output: unknown): string | null {
  if (!output) return null;
  if (Array.isArray(output)) return extractUrl(output[0]);
  if (typeof output === "string") return output;
  if (typeof (output as any)?.url === "function") {
    try {
      return String((output as any).url());
    } catch {
      return null;
    }
  }
  return null;
}

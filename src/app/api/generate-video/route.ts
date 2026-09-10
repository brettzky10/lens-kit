import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { callLocalVideoApi } from "@/lib/localModelClient";
import { SEEDANCE_MODEL_SLUG, MINIMAX_MODEL_SLUG } from "@/lib/providerOptions";

/**
 * Video generation, with a choice of provider:
 *  - "flux" (default): Replicate's black-forest-labs/flux-3. Requires
 *    REPLICATE_API_TOKEN. Uses a single video reference as start_video
 *    (mutually exclusive with images per its schema — prefers start_video
 *    when present).
 *  - "seedance": Replicate's Seedance 2.5. Requires REPLICATE_API_TOKEN.
 *    Accepts BOTH reference_images and reference_videos simultaneously
 *    (they're only mutually exclusive with the single first/last-frame
 *    image fields, which this app doesn't expose).
 *  - "minimax": Replicate's MiniMax H3. Requires REPLICATE_API_TOKEN.
 *    Also accepts both reference_image_urls and reference_video_urls
 *    together; its aspect-ratio field is named "ratio", not
 *    "aspect_ratio".
 *  - "local": your own network-hosted model. Requires LOCAL_VIDEO_API_URL
 *    (and optionally LOCAL_API_KEY) — see lib/localModelClient.ts for the
 *    assumed request/response contract, which you can adjust to match your
 *    server exactly.
 *
 * Falls back to a sample placeholder video when the chosen provider isn't
 * configured, or its call fails — and reports why in the response.
 */
export async function POST(req: NextRequest) {
  const {
    prompt,
    imageRefs,
    videoRefs,
    duration = "auto",
    resolution = "720p",
    aspectRatio = "auto",
    provider = "flux",
  } = await req.json();

  const refImages: string[] = Array.isArray(imageRefs) ? imageRefs : [];
  const refVideos: string[] = Array.isArray(videoRefs) ? videoRefs : [];

  // Shot/Video node clips are relative paths (e.g. "/shots/foo.mp4").
  // Replicate needs a publicly resolvable absolute URL, so resolve them
  // against this request's own origin. Note: this only actually works for
  // Replicate once the app is deployed somewhere public — Replicate's
  // servers can't fetch a URL pointing at your own localhost. A local model
  // on the same machine/network may be able to fetch it, depending on setup.
  const resolveUrl = (u: string) => (u.startsWith("/") ? new URL(u, req.nextUrl.origin).toString() : u);
  const resolvedImageRefs = refImages.map(resolveUrl);
  const resolvedVideoRefs = refVideos.map(resolveUrl);

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
        prompt,
        imageRefs: resolvedImageRefs,
        videoRefs: resolvedVideoRefs,
        duration,
        resolution,
        aspectRatio,
      });
      return NextResponse.json({ videoUrl: url, fallback: false });
    } catch (err: any) {
      console.error("Local video model call failed, using placeholder:", err);
      return placeholder(err?.message || String(err));
    }
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — serving a placeholder video instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  try {
    const replicate = new Replicate({ auth: token });

    if (provider === "seedance") {
      const input: Record<string, unknown> = {
        prompt: prompt || "",
        duration: parseInt(duration, 10) || 5,
        resolution,
        aspect_ratio: aspectRatio,
        generate_audio: true,
        watermark: false,
        output_format: "mp4",
      };
      if (resolvedImageRefs.length > 0) input.reference_images = resolvedImageRefs.slice(0, 30);
      if (resolvedVideoRefs.length > 0) input.reference_videos = resolvedVideoRefs.slice(0, 10);

      const output = await replicate.run(SEEDANCE_MODEL_SLUG, { input });
      const videoUrl = extractUrl(output);
      if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");
      return NextResponse.json({ videoUrl, fallback: false });
    }

    if (provider === "minimax") {
      const input: Record<string, unknown> = {
        prompt: prompt || "",
        duration: parseInt(duration, 10) || 6,
        resolution,
        // MiniMax H3 names its aspect-ratio field "ratio", not
        // "aspect_ratio" — the schema says image-to-video mode requires
        // "adaptive", which is exactly what our aspectRatio value already
        // is when the person picks it.
        ratio: aspectRatio,
      };
      if (resolvedImageRefs.length > 0) input.reference_image_urls = resolvedImageRefs.slice(0, 30);
      if (resolvedVideoRefs.length > 0) input.reference_video_urls = resolvedVideoRefs.slice(0, 10);

      const output = await replicate.run(MINIMAX_MODEL_SLUG, { input });
      const videoUrl = extractUrl(output);
      if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");
      return NextResponse.json({ videoUrl, fallback: false });
    }

    // provider === "flux"
    const input: Record<string, unknown> = {
      draft: false,
      prompt,
      duration,
      resolution,
      aspect_ratio: aspectRatio,
      generate_audio: true,
      safety_tolerance: 2,
    };

    // start_video and images are mutually exclusive per the flux-3 schema —
    // prefer start_video (the first connected video reference) when present.
    if (resolvedVideoRefs[0]) {
      input.start_video = resolvedVideoRefs[0];
    } else {
      input.images = resolvedImageRefs;
    }

    const output = await replicate.run("black-forest-labs/flux-3", { input });
    const videoUrl = extractUrl(output);
    if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");

    return NextResponse.json({ videoUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err, provider);
    console.error(`Replicate ${provider} video generation failed, using placeholder:`, reason, err);
    return placeholder(reason);
  }
}

function describeReplicateError(err: any, provider: string): string {
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return "Replicate rejected the API token (401 Unauthorized) — check REPLICATE_API_TOKEN.";
    if (status === 402) return "Replicate returned 402 Payment Required — billing/credits may need to be set up on your Replicate account.";
    if (status === 404 && (provider === "seedance" || provider === "minimax")) {
      const slug = provider === "seedance" ? SEEDANCE_MODEL_SLUG : MINIMAX_MODEL_SLUG;
      const constName = provider === "seedance" ? "SEEDANCE_MODEL_SLUG" : "MINIMAX_MODEL_SLUG";
      return `Replicate model not found (404) — the ${provider} model slug in app/api/generate-video/route.ts ("${slug}") is a best guess; check the exact "owner/model" string on Replicate's site and update lib/providerOptions.ts's ${constName}.`;
    }
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

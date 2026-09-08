import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

/**
 * Video generation via Replicate's black-forest-labs/flux-3 model.
 * Requires REPLICATE_API_TOKEN in the environment. Falls back to a
 * sample placeholder video when no token is configured, or when the
 * Replicate call fails — and now reports why in the response.
 */
export async function POST(req: NextRequest) {
  const {
    prompt,
    imageRefs,
    duration = "auto",
    resolution = "720p",
    aspectRatio = "auto",
  } = await req.json();
  const token = process.env.REPLICATE_API_TOKEN;

  function placeholder(fallbackReason: string) {
    return NextResponse.json({
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      fallback: true,
      fallbackReason,
    });
  }

  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — serving a placeholder video instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  try {
    const replicate = new Replicate({ auth: token });

    const input = {
      draft: false,
      images: imageRefs ?? [],
      prompt,
      duration,
      resolution,
      aspect_ratio: aspectRatio,
      generate_audio: true,
      safety_tolerance: 2,
    };

    const output = await replicate.run("black-forest-labs/flux-3", { input });

    const videoUrl = extractUrl(output);
    if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");

    return NextResponse.json({ videoUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err);
    console.error("Replicate flux-3 generation failed, using placeholder:", reason, err);
    return placeholder(reason);
  }
}

function describeReplicateError(err: any): string {
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return "Replicate rejected the API token (401 Unauthorized) — check REPLICATE_API_TOKEN.";
    if (status === 402) return "Replicate returned 402 Payment Required — billing/credits may need to be set up on your Replicate account.";
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

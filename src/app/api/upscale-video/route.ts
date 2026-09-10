import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
/* import { callLocalVideoApi } from "@/lib/localModelClient"; */

/**
 * Video upscaling via Replicate's black-forest-labs/flux-video-upscale
 * model, with a choice of provider:
 *  - "flux" (default): Requires REPLICATE_API_TOKEN.
 *  - "local": your own network-hosted model. Requires LOCAL_VIDEO_API_URL
 *    (and optionally LOCAL_API_KEY) — see lib/localModelClient.ts.
 *
 * Falls back to returning the original input video untouched when the
 * chosen provider isn't configured or the call fails, so the graph stays
 * testable without credentials (clearly flagged as a fallback, not a real
 * upscale).
 */
export async function POST(req: NextRequest) {
  const {
    inputVideo,
    prompt = "",
    creativity = 1,
    upscaleFactor = 2,
    safetyTolerance = 2,
    provider = "flux",
  } = await req.json();

  if (!inputVideo) {
    return NextResponse.json({ error: "input_video is required" }, { status: 400 });
  }

  // input_video needs to be a publicly resolvable URL for Replicate. A Shot
  // node's clip or this app's own generated video may be a relative path —
  // resolve it against this request's own origin (see the same note in
  // generate-video/route.ts about Replicate not being able to reach
  // localhost).
  const resolvedInputVideo: string = inputVideo.startsWith("/")
    ? new URL(inputVideo, req.nextUrl.origin).toString()
    : inputVideo;

  function placeholder(fallbackReason: string) {
    return NextResponse.json({
      videoUrl: resolvedInputVideo,
      fallback: true,
      fallbackReason,
    });
  }

 /*  if (provider === "local") {
    try {
      const { url } = await callLocalVideoApi({
        inputVideo: resolvedInputVideo,
        prompt,
        creativity,
        upscaleFactor,
        safetyTolerance,
      });
      return NextResponse.json({ videoUrl: url, fallback: false });
    } catch (err: any) {
      console.error("Local video upscale model call failed, using original video:", err);
      return placeholder(err?.message || String(err));
    }
  }
 */
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — returning the original video instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  try {
    const replicate = new Replicate({ auth: token });

    const input = {
      prompt,
      creativity,
      input_video: resolvedInputVideo,
      upscale_factor: upscaleFactor,
      safety_tolerance: safetyTolerance,
    };

    const output = await replicate.run("black-forest-labs/flux-video-upscale", { input });

    const videoUrl = extractUrl(output);
    if (!videoUrl) throw new Error("Could not extract a video URL from the Replicate response.");

    return NextResponse.json({ videoUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err);
    console.error("Replicate flux-video-upscale failed, returning original video:", reason, err);
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

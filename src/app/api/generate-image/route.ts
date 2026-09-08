import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

/**
 * Image generation via Replicate's black-forest-labs/flux-2-max model.
 * Requires REPLICATE_API_TOKEN in the environment. Falls back to a
 * deterministic placeholder image when no token is configured, or when
 * the Replicate call fails for any reason — reporting *why* it fell back
 * so that's visible in the UI instead of only in the server terminal.
 */
export async function POST(req: NextRequest) {
  const {
    prompt,
    imageRefs,
    resolution = "1 MP",
    aspectRatio = "1:1",
  } = await req.json();
  const token = process.env.REPLICATE_API_TOKEN;

  function placeholder(fallbackReason: string) {
    const seed = encodeURIComponent(prompt || "cine-flow").slice(0, 64);
    return NextResponse.json({
      imageUrl: `https://picsum.photos/seed/${seed}/960/540`,
      fallback: true,
      fallbackReason,
    });
  }

  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — serving a placeholder image instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  try {
    const replicate = new Replicate({ auth: token });

    const input: Record<string, unknown> = {
      prompt,
      resolution,
      aspect_ratio: aspectRatio,
      // flux-2-max's `input_images` field accepts up to 8 images, used for
      // image-to-image / reference-guided generation.
      input_images: Array.isArray(imageRefs) ? imageRefs.slice(0, 8) : [],
      output_format: "jpg",
      output_quality: 80,
      safety_tolerance: 2,
    };

    const output = await replicate.run("black-forest-labs/flux-2-max", { input });

    // The JS client returns a FileOutput (has .url()) for single-file
    // outputs, but some model versions return a plain string or an
    // array of strings/FileOutputs — handle all of those shapes.
    const imageUrl = extractUrl(output);
    if (!imageUrl) throw new Error("Could not extract an image URL from the Replicate response.");

    return NextResponse.json({ imageUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err);
    console.error("Replicate flux-2-max generation failed, using placeholder:", reason, err);
    return placeholder(reason);
  }
}

function describeReplicateError(err: any): string {
  if (err?.response) {
    // Replicate's ApiError carries the failed HTTP Response.
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

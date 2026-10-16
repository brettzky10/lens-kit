import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { IMAGE_MODEL_SLUGS, type ImageModelProvider } from "@/lib/providerOptions";

/**
 * Image generation via Replicate, by provider:
 *  - "nanobanana": Nano Banana Pro (up to 14 reference images)
 *  - "flux" (default): Flux 2 Pro (up to 8 input images)
 *  - "grok": Grok Imagine Image 2 (one image = edit mode)
 *  - "local": not wired up in this route yet (returns a placeholder)
 * Falls back to a deterministic placeholder image when no token is set or the call fails,
 * and reports why.
 */
export async function POST(req: NextRequest) {
  const {
    prompt,
    imageRefs,
    provider = "flux",
    resolution,
    aspectRatio,
  } = await req.json();
  const token = process.env.REPLICATE_API_TOKEN;
  const refs: string[] = Array.isArray(imageRefs) ? imageRefs : [];

  function placeholder(fallbackReason: string) {
    const seed = encodeURIComponent(prompt || "cine-flow").slice(0, 64);
    return NextResponse.json({
      imageUrl: `https://picsum.photos/seed/${seed}/960/540`,
      fallback: true,
      fallbackReason,
    });
  }

  if (provider === "local") return placeholder("The local image model isn't wired up in /api/generate-image yet.");

  if (!token) {
    console.warn("REPLICATE_API_TOKEN is not set — serving a placeholder image instead of calling Replicate.");
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  const p = provider as Exclude<ImageModelProvider, "local">;
  const slug = IMAGE_MODEL_SLUGS[p];
  if (!slug) return NextResponse.json({ error: `Unknown image provider "${provider}"` }, { status: 400 });

  try {
    const replicate = new Replicate({ auth: token });
    let input: Record<string, unknown>;

    if (p === "nanobanana") {
      input = {
        prompt,
        resolution: resolution ?? "1K",
        aspect_ratio: aspectRatio ?? "match_input_image",
        image_input: refs.slice(0, 14),
        output_format: "jpg",
        safety_filter_level: "block_only_high",
      };
    } else if (p === "grok") {
      input = {
        prompt,
        resolution: resolution ?? "2k",
        aspect_ratio: aspectRatio ?? "1:1",
        quality: "medium",
      };
      if (refs[0]) input.image = refs[0]; // edit mode (aspect_ratio is ignored by the model then)
    } else {
      // flux 2: "match_input_image" only makes sense when there is an input image
      const hasRefs = refs.length > 0;
      input = {
        prompt,
        resolution: !hasRefs && (!resolution || resolution === "match_input_image") ? "1 MP" : resolution,
        aspect_ratio: !hasRefs && (!aspectRatio || aspectRatio === "match_input_image") ? "1:1" : aspectRatio,
        input_images: refs.slice(0, 8),
        output_format: "jpg",
        output_quality: 80,
        safety_tolerance: 2,
      };
    }

    const output = await replicate.run(slug as `${string}/${string}`, { input });
    const imageUrl = extractUrl(output);
    if (!imageUrl) throw new Error("Could not extract an image URL from the Replicate response.");
    return NextResponse.json({ imageUrl, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err, slug);
    console.error(`Replicate ${p} image generation failed, using placeholder:`, reason, err);
    return placeholder(reason);
  }
}

function describeReplicateError(err: any, slug: string): string {
  if (err?.response) {
    const status = err.response.status;
    if (status === 401) return "Replicate rejected the API token (401 Unauthorized) — check REPLICATE_API_TOKEN.";
    if (status === 402) return "Replicate returned 402 Payment Required — billing/credits may need to be set up on your Replicate account.";
    if (status === 404) return `Replicate model not found (404): "${slug}" is a best guess. Check the exact owner/model on replicate.com and update IMAGE_MODEL_SLUGS in lib/providerOptions.ts.`;
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

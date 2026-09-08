import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { buildFullSheetPrompt, buildOutputPrompt } from "@/lib/sheetPromptTemplate";
import { SHEET_CONFIGS } from "@/lib/sheetConfig";
import { isSheetKind } from "@/lib/types";
/* import { callLocalImageApi } from "@/lib/localModelClient"; */

/**
 * Generates ONE combined reference sheet image (3 consistent views composed
 * into a single image — see lib/sheetConfig.ts for the exact panel layout
 * per kind) via a single generation call, with a choice of provider:
 *  - "flux" (default): Replicate's black-forest-labs/flux-2-max. Requires
 *    REPLICATE_API_TOKEN.
 *  - "local": your own network-hosted model. Requires LOCAL_IMAGE_API_URL
 *    (and optionally LOCAL_API_KEY) — see lib/localModelClient.ts.
 *
 * Uses the connected reference photos (`imageRefs`) for consistency, plus
 * outputs a reusable description via this node's prompt-output connector.
 * Falls back to a placeholder image (the output prompt still gets built)
 * when the chosen provider isn't configured or the call fails.
 */
export async function POST(req: NextRequest) {
  const { kind, prompt = "", imageRefs, provider = "flux" } = await req.json();

  if (!isSheetKind(kind)) {
    return NextResponse.json({ error: `Unknown sheet kind: ${kind}` }, { status: 400 });
  }

  const config = SHEET_CONFIGS[kind];
  const refs = Array.isArray(imageRefs)
    ? imageRefs.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, 8)
    : [];

  const fullPrompt = buildFullSheetPrompt(kind, prompt, refs.length > 0);
  const outputPrompt = buildOutputPrompt(kind, prompt, fullPrompt);

  function placeholder(fallbackReason: string) {
    const seed = encodeURIComponent(prompt || kind).slice(0, 64);
    return NextResponse.json({
      sheetImage: `https://picsum.photos/seed/${seed}/1024/1024`,
      outputPrompt,
      fallback: true,
      fallbackReason,
    });
  }

 /*  if (provider === "local") {
    try {
      const { url } = await callLocalImageApi({
        prompt: fullPrompt,
        imageRefs: refs,
        resolution: "1 MP",
        aspectRatio: config.aspectRatio,
      });
      return NextResponse.json({ sheetImage: url, outputPrompt, fallback: false });
    } catch (err: any) {
      console.error(`Local image model ${kind} sheet generation failed, using placeholder:`, err);
      return placeholder(err?.message || String(err));
    }
  } */

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn(`REPLICATE_API_TOKEN is not set — serving a placeholder ${kind} sheet instead of calling Replicate.`);
    return placeholder("No REPLICATE_API_TOKEN set in the server environment.");
  }

  try {
    const replicate = new Replicate({ auth: token });

    const input: Record<string, unknown> = {
      prompt: fullPrompt,
      resolution: "1 MP",
      aspect_ratio: config.aspectRatio,
      output_format: "jpg",
      output_quality: 90,
      safety_tolerance: 2,
    };
    if (refs.length > 0) {
      input.input_images = refs;
    }

    console.log(`Generating ${kind} sheet with ${refs.length} reference image(s), provider=flux.`);

    const output = await replicate.run("black-forest-labs/flux-2-max", { input });
    const sheetImage = extractUrl(output);
    if (!sheetImage) throw new Error("Could not extract an image URL from the Replicate response.");

    return NextResponse.json({ sheetImage, outputPrompt, fallback: false });
  } catch (err: any) {
    const reason = describeReplicateError(err);
    console.error(`Replicate flux-2-max ${kind} sheet generation failed, using placeholder:`, reason, err);
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

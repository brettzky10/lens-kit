import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const CHARACTER_SHEET_INSTRUCTIONS = `
Create a professional cinematic character reference sheet as ONE SINGLE IMAGE.

The image must contain THREE clearly separated views of the EXACT SAME CHARACTER:

1. FACIAL CLOSE-UP
   - Detailed head and face portrait
   - Clearly show facial features, hairstyle, eyes, nose, mouth, facial hair, skin details and expression

2. FULL-BODY FRONT
   - Full character from head to toe
   - Straight-on frontal view
   - Clearly show clothing, footwear, body proportions and physical details

3. FULL-BODY REAR
   - Full character from head to toe
   - Straight-on rear/back view
   - Clearly show the back of the hairstyle, clothing, equipment and other rear details

IMPORTANT CHARACTER CONSISTENCY:
- All three views MUST depict the exact same person.
- Identical face and facial structure.
- Identical hairstyle and hair color.
- Identical body proportions.
- Identical clothing.
- Identical colors and materials.
- Identical accessories and equipment.
- Do not redesign or change the character between views.

COMPOSITION:
- ONE image only.
- Arrange the three views cleanly in a professional character reference sheet layout.
- Make each view clearly distinguishable.
- Use a neutral studio/background treatment.
- Keep the entire body visible in both full-body views.
- Do not crop the head or feet of the full-body views.
- The facial close-up should be large enough to clearly inspect the face.

Do NOT generate three separate images.
Do NOT return multiple images.
The final output must be ONE combined character sheet image.
`;

export async function POST(req: NextRequest) {
  const {
    prompt = "",
    imageRefs = [],
  } = await req.json();

  const token = process.env.REPLICATE_API_TOKEN;

  function placeholder(fallbackReason: string) {
    const seed = encodeURIComponent(
      prompt || "character-sheet"
    ).slice(0, 64);

    return NextResponse.json({
      sheetImage: `https://picsum.photos/seed/${seed}/1024/1024`,
      characterPrompt: prompt || "",
      fallback: true,
      fallbackReason,
    });
  }

  if (!token) {
    console.warn(
      "REPLICATE_API_TOKEN is not set — serving a placeholder character sheet."
    );

    return placeholder(
      "No REPLICATE_API_TOKEN set in the server environment."
    );
  }

  try {
    const replicate = new Replicate({
      auth: token,
    });

    /*
     * Build the final generation prompt.
     *
     * If the user supplied a prompt, it becomes the character
     * description. If they only supplied reference images,
     * the model can use those references to determine the
     * character's appearance.
     */
    const characterDescription = prompt.trim()
      ? `
CHARACTER DESCRIPTION:
${prompt.trim()}
`
      : `
CHARACTER DESCRIPTION:
Use the supplied reference image(s) as the primary visual
reference for the character.
`;

    const finalPrompt = `
${CHARACTER_SHEET_INSTRUCTIONS}

${characterDescription}

Use any supplied reference image(s) as visual references for
the character's identity and appearance.

REFERENCE IMAGE PRIORITY:
- Preserve the identity of the person in the reference.
- Preserve facial structure.
- Preserve hairstyle.
- Preserve clothing and distinctive physical characteristics
  whenever they are visible.
- The three views must remain visually consistent with the
  supplied reference.

Generate the final character sheet now.
`.trim();

    const validImageRefs = Array.isArray(imageRefs)
      ? imageRefs
          .filter(
            (url): url is string =>
              typeof url === "string" && url.length > 0
          )
          .slice(0, 8)
      : [];

    /*
     * Exactly ONE Replicate generation.
     */
    const input: Record<string, unknown> = {
      prompt: finalPrompt,

      resolution: "1 MP",
      aspect_ratio: "1:1",

      output_format: "jpg",
      output_quality: 90,

      safety_tolerance: 2,
    };

    /*
     * Only send input_images when we actually have references.
     */
    if (validImageRefs.length > 0) {
      input.input_images = validImageRefs;
    }

    console.log(
      `Generating character sheet with ${validImageRefs.length} reference image(s).`
    );

    const output = await replicate.run(
      "black-forest-labs/flux-2-max",
      {
        input,
      }
    );

    const sheetImage = extractUrl(output);

    if (!sheetImage) {
      throw new Error(
        "Could not extract an image URL from the Replicate response."
      );
    }

    /*
     * The character prompt is the reusable description that
     * can be passed downstream to another node.
     */
    const characterPrompt = buildCharacterPrompt(
      prompt,
      finalPrompt
    );

    return NextResponse.json({
      sheetImage,
      characterPrompt,
      fallback: false,
    });
  } catch (err: unknown) {
    const reason = describeReplicateError(err);

    console.error(
      "Replicate character-sheet generation failed, using placeholder:",
      reason,
      err
    );

    return placeholder(reason);
  }
}

/**
 * Creates the reusable character description that can be
 * passed downstream through CHARACTER_PROMPT_OUT_ID.
 */
function buildCharacterPrompt(
  prompt: string,
  generatedPrompt: string
): string {
  if (prompt?.trim()) {
    return prompt.trim();
  }

  /*
   * If there was no textual prompt, retain a useful description
   * of the character-sheet generation requirements.
   *
   * This can later be replaced with an LLM-generated character
   * description if desired.
   */
  return generatedPrompt;
}

function describeReplicateError(err: unknown): string {
  const error = err as {
    response?: {
      status?: number;
    };
    message?: string;
  };

  if (error?.response) {
    const status = error.response.status;

    if (status === 401) {
      return "Replicate rejected the API token (401 Unauthorized) — check REPLICATE_API_TOKEN.";
    }

    if (status === 402) {
      return "Replicate returned 402 Payment Required — billing/credits may need to be set up on your Replicate account.";
    }

    if (status === 422) {
      return `Replicate rejected the request (422): ${error.message ?? "Invalid input."}`;
    }

    return `Replicate API error (status ${status}): ${
      error.message ?? "Unknown Replicate error."
    }`;
  }

  return error?.message ?? String(err);
}

function extractUrl(output: unknown): string | null {
  if (!output) {
    return null;
  }

  /*
   * Some Replicate models return an array.
   */
  if (Array.isArray(output)) {
    return extractUrl(output[0]);
  }

  /*
   * Plain URL.
   */
  if (typeof output === "string") {
    return output;
  }

  /*
   * Replicate FileOutput.
   */
  if (
    typeof (output as { url?: unknown })?.url ===
    "function"
  ) {
    try {
      return String(
        (output as { url: () => unknown }).url()
      );
    } catch {
      return null;
    }
  }

  return null;
}
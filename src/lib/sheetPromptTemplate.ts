import type { SheetKind } from "./types";
import { SHEET_CONFIGS } from "./sheetConfig";

/**
 * Builds the FULL generation prompt sent to the image model: the fixed
 * panel-layout instructions for this kind, plus the subject description
 * (either what the person typed, or — if they only supplied reference
 * images — an instruction to use those references as the primary visual
 * identity).
 */
export function buildFullSheetPrompt(kind: SheetKind, rawDescription: string, hasImageRefs: boolean): string {
  const config = SHEET_CONFIGS[kind];
  const description = rawDescription.trim();

  const subjectDescription = description
    ? `${config.label.toUpperCase()} DESCRIPTION:\n${description}`
    : `${config.label.toUpperCase()} DESCRIPTION:\nUse the supplied reference image(s) as the primary visual reference for the ${config.subjectNoun}.`;

  const referenceNote = hasImageRefs
    ? `
REFERENCE IMAGE PRIORITY:
- Preserve the identity of the ${config.subjectNoun} shown in the reference image(s).
- Preserve its structure, materials, and distinctive characteristics whenever visible.
- All views must remain visually consistent with the supplied reference(s).
`.trim()
    : "";

  // The config's `layout` only holds the per-panel instructions, so add the
  // three-card framing here (same wording as buildSheetPrompt in sheetConfig.ts).
  const intro =
    `A single ${config.aspectRatio} landscape image divided vertically into three equal side-by-side cards, separated by thin clean dividers. ` +
    `All three cards show the exact same ${config.subjectNoun}, kept consistent in design, colors, materials, proportions and style.`;
  const noText = "No text, captions, labels, numbers or watermarks anywhere in the image.";

  return [intro, config.layout, subjectDescription, referenceNote, noText, `Generate the final ${config.subjectNoun} sheet now.`]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The reusable ~short description output via the sheet-prompt-out
 * connector: the raw typed description if there was one, otherwise falls
 * back to the full generation prompt so downstream nodes still get
 * *something* describing this sheet's subject.
 *
 * NOTE: there's no LLM/text-generation API wired into this app — this is
 * plain passthrough/fallback text, not an AI-expanded description. Swap
 * this out for a real completion call if you want genuine elaboration.
 */
export function buildOutputPrompt(kind: SheetKind, rawDescription: string, fullPrompt: string): string {
  return rawDescription.trim() ? rawDescription.trim() : fullPrompt;
}

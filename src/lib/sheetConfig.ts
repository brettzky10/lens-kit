import type { SheetKind } from "./types";

export interface SheetConfig {
  label: string;
  subjectNoun: string;
  /** the three panels, left to right (shown as the empty-state hint) */
  views: [string, string, string];
  placeholder: string;
  /** panel-by-panel instructions that go into the generation prompt */
  layout: string;
}

export const SHEET_CONFIGS: Record<SheetKind, SheetConfig> = {
  character: {
    label: "Character",
    subjectNoun: "character",
    views: ["Face", "Full body front", "Full body back"],
    placeholder: "Connect a Prompt node to describe this character…",
    layout:
      "Panel 1 (left): a close-up portrait of the character's face, head and shoulders, looking at the camera. " +
      "Panel 2 (middle): the full body seen from the front, head to toe, standing in a relaxed neutral pose. " +
      "Panel 3 (right): the full body seen from directly behind, head to toe, in the same neutral pose. " +
      "Plain neutral studio background and identical soft lighting in all three panels.",
  },
  object: {
    label: "Prop",
    subjectNoun: "prop",
    views: ["Front, full", "Perspective", "Other angle"],
    placeholder: "Connect a Prompt node to describe this prop…",
    layout:
      "Panel 1 (left): the entire prop seen straight from the front, fully in frame and centered. " +
      "Panel 2 (middle): a three-quarter perspective view of the prop from slightly above, as if walking around it. " +
      "Panel 3 (right): a different angle of the prop, from the side or behind, showing details not visible in the other two. " +
      "Plain neutral studio background and identical soft lighting in all three panels.",
  },
  location: {
    label: "Location",
    subjectNoun: "location",
    views: ["View 1", "View 2 (turned ~120°)", "View 3 (turned ~240°)"],
    placeholder: "Connect a Prompt node to describe this location…",
    layout:
      "The three panels are three photographs taken from the same spot while slowly turning in a circle: " +
      "Panel 1 (left) looks in one direction; Panel 2 (middle) is rotated about 120 degrees from it; " +
      "Panel 3 (right) is rotated about 240 degrees. Together they should read as one continuous place, with consistent " +
      "architecture, landscape, props, time of day, weather and lighting, and no repeated framing between panels.",
  },
};

/** One 16:9 image, three equal vertical cards, same subject in each. */
export function buildSheetPrompt(kind: SheetKind, description: string, hasReferences: boolean): string {
  const c = SHEET_CONFIGS[kind];
  return [
    `A single 16:9 landscape image divided vertically into three equal side-by-side cards, separated by thin clean dividers. ` +
      `All three cards show the exact same ${c.subjectNoun}, kept consistent in design, colors, materials, proportions and style.`,
    c.layout,
    hasReferences
      ? `Use the provided reference images as the exact visual reference for the ${c.subjectNoun}.`
      : "",
    description ? `The ${c.subjectNoun}: ${description}` : "",
    "No text, captions, labels, numbers or watermarks anywhere in the image.",
  ].filter(Boolean).join("\n\n");
}

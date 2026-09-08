import type { SheetKind } from "./types";

export interface SheetConfig {
  label: string;
  subjectNoun: string;
  // Fixed panel-by-panel layout instructions given to the image model so it
  // renders THREE consistent views of the same subject inside ONE combined
  // image (not three separate generations).
  layoutInstructions: string;
  aspectRatio: string;
}

const CONSISTENCY_FOOTER = (subjectNoun: string) => `
IMPORTANT CONSISTENCY:
- All views MUST depict the exact same ${subjectNoun}.
- Identical shape, structure and proportions across every view.
- Identical colors, materials and finish across every view.
- Identical distinguishing details and markings across every view.
- Do not redesign or change the ${subjectNoun} between views.

COMPOSITION:
- ONE image only.
- Arrange the views cleanly in a professional reference-sheet layout.
- Make each view clearly distinguishable, with a plain neutral background.
- Do not crop the primary subject in any view.

Do NOT generate multiple separate images.
Do NOT return more than one image.
The final output must be ONE combined reference sheet image.
`.trim();

export const SHEET_CONFIGS: Record<SheetKind, SheetConfig> = {
  character: {
    label: "Character",
    subjectNoun: "character",
    aspectRatio: "1:1",
    layoutInstructions: `
Create a professional cinematic character reference sheet as ONE SINGLE IMAGE.

The image must contain THREE clearly separated views of the EXACT SAME CHARACTER:

1. FACIAL CLOSE-UP
   - Detailed head and face portrait
   - Clearly show facial features, hairstyle, eyes, nose, mouth, facial hair, skin details and expression

2. FULL-BODY FRONT
   - Full character from head to toe, straight-on frontal view
   - Clearly show clothing, footwear, body proportions and physical details

3. FULL-BODY REAR
   - Full character from head to toe, straight-on rear/back view
   - Clearly show the back of the hairstyle, clothing, equipment and other rear details

${CONSISTENCY_FOOTER("character")}
`.trim(),
  },
  object: {
    label: "Object",
    subjectNoun: "object",
    aspectRatio: "1:1",
    layoutInstructions: `
Create a professional product/object reference sheet as ONE SINGLE IMAGE.

The image must contain THREE clearly separated views of the EXACT SAME OBJECT:

1. SIDE ANGLE
   - Straight-on side profile view
   - Clearly show the object's silhouette, proportions and side details

2. FULL FRONT
   - Straight-on front view
   - Clearly show the object's front face, materials, colors and markings

3. FULL BACK
   - Straight-on rear view
   - Clearly show the back of the object, including any rear details or markings

${CONSISTENCY_FOOTER("object")}
`.trim(),
  },
  location: {
    label: "Location",
    subjectNoun: "location",
    aspectRatio: "16:9",
    layoutInstructions: `
Create a professional location reference sheet as ONE SINGLE IMAGE.

The image must contain THREE clearly separated views of the EXACT SAME LOCATION:

1. ESTABLISHING WIDE SHOT
   - Wide view showing the full environment
   - Clearly show the overall layout, architecture and scale

2. ALTERNATE ANGLE
   - A different vantage point of the same environment
   - Same lighting and atmosphere as the establishing shot

3. DETAIL SHOT
   - Close-up of a distinctive architectural or environmental detail within the same location
   - Same lighting and material conditions as the other two views

${CONSISTENCY_FOOTER("location")}
`.trim(),
  },
};

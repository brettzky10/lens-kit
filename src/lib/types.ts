export type FlowNodeType =
  | "prompt"
  | "camera"
  | "lens"
  | "image"
  | "video"
  | "character"
  | "object"
  | "location"
  | "reference"
  | "shot"
  | "upscale"
  | "lut";

// The three "sheet generator" node kinds share identical structure/behavior
// (2 inputs: prompt + image refs; 2 outputs: sheet images + output prompt) —
// they only differ in their view labels/prompts, defined in lib/sheetConfig.ts.
export const SHEET_KINDS = ["character", "object", "location"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export function isSheetKind(kind: string): kind is SheetKind {
  return (SHEET_KINDS as readonly string[]).includes(kind);
}

export interface PromptNodeData {
  [key: string]: unknown;
  kind: "prompt";
  text: string;
  // computed, read-only preview combining connected camera/lens injections
  composed?: string;
}

export interface CameraNodeData {
  [key: string]: unknown;
  kind: "camera";
  cameraId: string;
}

export interface LensNodeData {
  [key: string]: unknown;
  kind: "lens";
  lensId: string;
  focalLength: number;
  aperture: string;
}

export interface ImageNodeData {
  [key: string]: unknown;
  kind: "image";
  prompt: string;
  status: "idle" | "loading" | "done" | "error";
  progress: number;
  imageUrl?: string;
  provider: "flux" | "local";
}

export interface VideoNodeData {
  [key: string]: unknown;
  kind: "video";
  prompt: string;
  status: "idle" | "loading" | "done" | "error";
  progress: number;
  videoUrl?: string;
  duration: string;
  resolution: string;
  aspectRatio: string;
  provider: "flux" | "seedance" | "minimax" | "local";
}

/** Shared data shape for Character / Object / Location "sheet" nodes. */
export interface SheetNodeData {
  [key: string]: unknown;
  kind: SheetKind;
  status: "idle" | "loading" | "done" | "error";
  progress: number;
  // ONE combined image containing all 3 consistent views (facial/frontal/
  // back for character, side/front/back for object, or 3 location views),
  // composited by the model in a single generation call.
  sheetImage?: string;
  // The reusable description output via the sheet-prompt-out handle to
  // downstream Image/Video/Sheet nodes.
  outputPrompt: string;
  provider: "flux" | "local";
}

/** A user-provided reference image dropped directly into the canvas. */
export interface ReferenceNodeData {
  [key: string]: unknown;
  kind: "reference";
  imageUrl?: string;
  fileName?: string;
}

/** A picked camera-move shot, exporting both its prompt and its video clip. */
export interface ShotNodeData {
  [key: string]: unknown;
  kind: "shot";
  selectedShotId?: string;
}

/** Upscales a connected video clip via black-forest-labs/flux-video-upscale. */
export interface UpscaleNodeData {
  [key: string]: unknown;
  kind: "upscale";
  status: "idle" | "loading" | "done" | "error";
  progress: number;
  videoUrl?: string;
  // Optional description of the clip's content to steer added detail.
  prompt: string;
  creativity: 0 | 1;
  upscaleFactor: number;
  safetyTolerance: number;
  provider: "flux" | "local";
}

/** Applies a color-grading "look" (LUT-style) to a connected image, entirely client-side. */
export interface LutNodeData {
  [key: string]: unknown;
  kind: "lut";
  lutId?: string;
  status: "idle" | "processing" | "done" | "error";
  processedImage?: string;
}


export type AnyNodeData =
  | PromptNodeData
  | CameraNodeData
  | LensNodeData
  | ImageNodeData
  | VideoNodeData
  | SheetNodeData
  | ReferenceNodeData
  | ShotNodeData
  | UpscaleNodeData
  | LutNodeData;

export const NODE_TYPE_META: Record<
  FlowNodeType,
  { label: string; description: string }
> = {
  prompt: { label: "Prompt", description: "A text prompt block" },
  camera: { label: "Camera", description: "Pick a cinema camera body" },
  lens: { label: "Lens", description: "Pick a lens, focal length & aperture" },
  image: { label: "Image", description: "Generate an image from a prompt" },
  video: { label: "Video", description: "Generate a video from image refs" },
  character: {
    label: "Character",
    description: "One consistent character sheet (facial/frontal/back) + reusable prompt",
  },
  object: {
    label: "Object",
    description: "One consistent object sheet (side/front/back) + reusable prompt",
  },
  location: {
    label: "Location",
    description: "One consistent location sheet (3 views) + reusable prompt",
  },
  reference: {
    label: "Reference",
    description: "Drop in an image to use as a reference elsewhere",
  },
  shot: {
    label: "Shot",
    description: "Pick a camera-move shot — exports its prompt and its video clip",
  },
  upscale: {
    label: "Upscale",
    description: "Upscale a connected video clip",
  },
  lut: {
    label: "Color LUT",
    description: "Apply a color-grading look to a connected image",
  },
};



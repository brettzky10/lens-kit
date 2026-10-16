import type { ImageModelProvider, VideoGenerationProvider } from "./providerOptions";

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
  provider: ImageModelProvider;
  aspectRatio?: string;
  resolution?: string;
  fallbackNotice?: string | null;
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
  provider: VideoGenerationProvider;
  audio?: boolean;
  draft?: boolean;
  fallbackNotice?: string | null;
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
  // sheets are image generations (one 16:9 image, three cards), so they use the image models
  provider: ImageModelProvider;
  aspectRatio?: string;
  resolution?: string;
  fallbackNotice?: string | null;
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
  fallbackNotice?: string | null;
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
    description: "One 16:9 image: face, full body front, full body back",
  },
  object: {
    label: "Prop",
    description: "One 16:9 image, three angles of the same prop (front, perspective, other angle)",
  },
  location: {
    label: "Location",
    description: "One 16:9 image: three views of the same location, turning in a circle",
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


//SHOT
export type Vec3 = [number, number, number];

export type SubjectType = "person" | "car" | "house";

export interface ShotCamera {
  position: Vec3;
  target: Vec3;
  fov: number;
  roll: number;
}

export interface ShotSubject {
  type: SubjectType;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

/** The portable "Shot JSON" — enough to reproduce a shot exactly. */
export interface Shot {
  camera: ShotCamera;
  subject: ShotSubject;
}

export interface SavedShot {
  id: string;
  name: string;
  createdAt: number;
  shot: Shot;
}

/** The live rig state driving the scene — spherical, not cartesian. */
export interface RigState {
  azimuth: number; // degrees, 0 = camera in front of subject's facing direction
  elevation: number; // degrees, camera above (+) / below (-) subject's horizontal plane
  distance: number; // meters, camera-to-target distance
  fov: number; // degrees, vertical FOV
  roll: number; // degrees, camera roll around its view axis
  targetHeight: number; // meters, height of the look-at point above subject base
  subjectType: SubjectType;
  subjectRotationY: number; // degrees, subject yaw
  subjectScale: number;
}

export interface ShotAnalysis {
  distance: number;
  azimuthRelative: number; // -180..180, 0 = front, sign: + left, - right
  elevation: number;
  verticalTilt: number;
  fov: number;
  roll: number;
  perspectiveStrength: number; // 0-100
  perspectiveLabel: string;
  screenX: number; // -1..1 NDC
  screenY: number; // -1..1 NDC
  screenPositionLabel: string;
  subjectAngularSizeDeg: number;
  frameFraction: number; // 0..1+, fraction of vertical FOV the subject occupies
  framingLabel: string;
  aboveBelowLabel: "above" | "below" | "eye-level";
  sideLabel: "left" | "right" | "center";
  relationshipLabel: string; // front / 3/4 front / side / 3/4 rear / rear
}

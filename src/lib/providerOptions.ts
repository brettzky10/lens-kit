// Unchanged: used by Sheet (Character/Object/Location) and Upscale nodes.
export type GenerationProvider = "flux" | "local";
// Image node models (new).
export type ImageModelProvider = "flux" | "nanobanana" | "grok" | "local";
export type VideoGenerationProvider =
  | "veo"
  | "seedance"
  | "flux"
  | "wan"
  | "grok"
  | "minimax" // key kept for saved flows; the model is now Hailuo 2.3
  | "local";

export const TWO_PROVIDER_OPTIONS: { value: GenerationProvider; label: string }[] = [
  { value: "flux", label: "Flux (Replicate)" },
  { value: "local", label: "Local model" },
];
export const IMAGE_PROVIDERS = TWO_PROVIDER_OPTIONS;
export const UPSCALE_PROVIDERS = TWO_PROVIDER_OPTIONS;

export const IMAGE_NODE_MODELS: { value: ImageModelProvider; label: string }[] = [
  { value: "nanobanana", label: "Nano Banana Pro" },
  { value: "flux", label: "Flux 2 Pro" },
  { value: "grok", label: "Grok Imagine Image 2" },
  { value: "local", label: "Local model" },
];

export const VIDEO_PROVIDERS: { value: VideoGenerationProvider; label: string }[] = [
  { value: "veo", label: "Veo 3.1" },
  { value: "seedance", label: "Seedance 2.5" },
  { value: "flux", label: "Flux 3" },
  { value: "wan", label: "Wan 3" },
  { value: "grok", label: "Grok Imagine Video 1.5" },
  { value: "minimax", label: "Hailuo 2.3" },
  { value: "local", label: "Local model" },
];

export const DEFAULT_IMAGE_PROVIDER: GenerationProvider = "flux"; // sheets + upscale
export const DEFAULT_IMAGE_NODE_PROVIDER: ImageModelProvider = "nanobanana"; // Image node
export const DEFAULT_VIDEO_PROVIDER: VideoGenerationProvider = "flux";

// Replicate model slugs (confirmed). The generate-image / generate-video routes call
// replicate.run(<slug>) using these, so this is the only place to change them.
export const SEEDANCE_MODEL_SLUG = "bytedance/seedance-2.5";
export const MINIMAX_MODEL_SLUG = "minimax/hailuo-2.3";
export const VIDEO_MODEL_SLUGS: Record<Exclude<VideoGenerationProvider, "local">, string> = {
  veo: "google/veo-3.1",
  seedance: SEEDANCE_MODEL_SLUG,
  flux: "black-forest-labs/flux-3",
  wan: "alibaba/wan-3",
  grok: "xai/grok-imagine-video-1.5",
  minimax: MINIMAX_MODEL_SLUG,
};
export const IMAGE_MODEL_SLUGS: Record<Exclude<ImageModelProvider, "local">, string> = {
  flux: "black-forest-labs/flux-2-pro", // was flux-2-max; pro matches the pricing you sent
  nanobanana: "google/nano-banana-pro",
  grok: "xai/grok-imagine-image-2",
};

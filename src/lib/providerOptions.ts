export type GenerationProvider = "flux" | "local";
export type VideoGenerationProvider = "flux" | "seedance" | "minimax" | "local";

// Providers offering only Flux/local (image generation, and the video
// upscale node, which is Flux-only).
export const TWO_PROVIDER_OPTIONS: { value: GenerationProvider; label: string }[] = [
  { value: "flux", label: "Flux (Replicate)" },
  { value: "local", label: "Local model" },
];
export const IMAGE_PROVIDERS = TWO_PROVIDER_OPTIONS;
export const UPSCALE_PROVIDERS = TWO_PROVIDER_OPTIONS;

// The Video node offers two more options beyond Flux: Seedance 2.5 and
// MiniMax H3.
export const VIDEO_PROVIDERS: { value: VideoGenerationProvider; label: string }[] = [
  { value: "flux", label: "Flux 3 (Replicate)" },
  { value: "seedance", label: "Seedance 2.5 (Replicate)" },
  { value: "minimax", label: "MiniMax H3 (Replicate)" },
  { value: "local", label: "Local model" },
];

export const DEFAULT_IMAGE_PROVIDER: GenerationProvider = "flux";
export const DEFAULT_VIDEO_PROVIDER: VideoGenerationProvider = "flux";

// NOTE: I don't have Seedance 2.5's or MiniMax H3's exact Replicate
// "owner/model-name" slugs confirmed — these are best guesses at the
// naming convention. Check each model's actual page on Replicate and
// update these if a call 404s.
export const SEEDANCE_MODEL_SLUG = "bytedance/seedance-2.5";
export const MINIMAX_MODEL_SLUG = "minimax/hailuo-h3";

export type GenerationProvider = "flux" | "local";

export const IMAGE_PROVIDERS: { value: GenerationProvider; label: string }[] = [
  { value: "flux", label: "Flux (Replicate)" },
  { value: "local", label: "Local model" },
];

export const VIDEO_PROVIDERS: { value: GenerationProvider; label: string }[] = [
  { value: "flux", label: "Flux (Replicate)" },
  { value: "local", label: "Local model" },
];

export const DEFAULT_IMAGE_PROVIDER: GenerationProvider = "flux";
export const DEFAULT_VIDEO_PROVIDER: GenerationProvider = "flux";

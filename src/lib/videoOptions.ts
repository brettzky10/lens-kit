import type { VideoGenerationProvider } from "./providerOptions";

// Selector option lists for the Video node, keyed by provider — each
// backing model has a different enum, so switching providers swaps these.

// black-forest-labs/flux-3
const FLUX_DURATIONS = [
  "auto",
  "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15",
  "16", "17", "18", "19", "20",
] as const;
const FLUX_RESOLUTIONS = ["720p", "1080p"] as const;
const FLUX_ASPECT_RATIOS = ["auto", "21:9", "2:1", "16:9", "4:3", "1:1", "3:4", "9:16"] as const;

// Seedance 2.5 — duration is a free integer (-1 for "intelligent duration",
// up to 30s) in the real schema; these are just convenient presets.
const SEEDANCE_DURATIONS = ["-1", "5", "10", "15", "20", "25", "30"] as const;
const SEEDANCE_RESOLUTIONS = ["480p", "720p"] as const;
const SEEDANCE_ASPECT_RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] as const;

// MiniMax H3 — duration is a free integer from 4 to 15s in the real
// schema; these are convenient presets. Resolution uses the model's exact
// casing ("768P"/"2K"). "ratio" isn't a strict enum per the docs (any
// concrete ratio like "16:9" works, "adaptive" for image-to-video) — these
// are common presets, not an exhaustive list.
const MINIMAX_DURATIONS = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"] as const;
const MINIMAX_RESOLUTIONS = ["768P", "2K"] as const;
const MINIMAX_ASPECT_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"] as const;

export const VIDEO_DURATIONS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  flux: FLUX_DURATIONS,
  seedance: SEEDANCE_DURATIONS,
  minimax: MINIMAX_DURATIONS,
  local: FLUX_DURATIONS,
};
export const VIDEO_RESOLUTIONS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  flux: FLUX_RESOLUTIONS,
  seedance: SEEDANCE_RESOLUTIONS,
  minimax: MINIMAX_RESOLUTIONS,
  local: FLUX_RESOLUTIONS,
};
export const VIDEO_ASPECT_RATIOS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  flux: FLUX_ASPECT_RATIOS,
  seedance: SEEDANCE_ASPECT_RATIOS,
  minimax: MINIMAX_ASPECT_RATIOS,
  local: FLUX_ASPECT_RATIOS,
};

export const DEFAULT_DURATION_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  flux: "auto",
  seedance: "5",
  minimax: "6",
  local: "auto",
};
export const DEFAULT_RESOLUTION_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  flux: "720p",
  seedance: "720p",
  minimax: "768P",
  local: "720p",
};
export const DEFAULT_ASPECT_RATIO_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  flux: "auto",
  seedance: "16:9",
  minimax: "16:9",
  local: "auto",
};

// Backward-compatible flat exports (used as the flow store's initial
// defaults before a provider is chosen).
export const VIDEO_DURATIONS = FLUX_DURATIONS;
export const VIDEO_RESOLUTIONS = FLUX_RESOLUTIONS;
export const VIDEO_ASPECT_RATIOS = FLUX_ASPECT_RATIOS;
export const DEFAULT_VIDEO_DURATION = DEFAULT_DURATION_BY_PROVIDER.flux;
export const DEFAULT_VIDEO_RESOLUTION = DEFAULT_RESOLUTION_BY_PROVIDER.flux;
export const DEFAULT_VIDEO_ASPECT_RATIO = DEFAULT_ASPECT_RATIO_BY_PROVIDER.flux;

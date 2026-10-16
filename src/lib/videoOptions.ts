import type { VideoGenerationProvider } from "./providerOptions";

// ── Per-model option lists (values are strings because the store keeps them as strings) ──
const VEO_DURATIONS = ["4", "6", "8"] as const;
const VEO_RESOLUTIONS = ["720p", "1080p"] as const;
const VEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;

const FLUX_DURATIONS = [
  "auto", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
] as const;
const FLUX_RESOLUTIONS = ["720p", "1080p"] as const;
const FLUX_ASPECT_RATIOS = ["auto", "21:9", "2:1", "16:9", "4:3", "1:1", "3:4", "9:16"] as const;

// Seedance: "-1" = model picks the length.
const SEEDANCE_DURATIONS = ["-1", "4", "5", "6", "8", "10", "15", "20", "25", "30"] as const;
const SEEDANCE_RESOLUTIONS = ["480p", "720p"] as const;
const SEEDANCE_ASPECT_RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] as const;

const WAN_DURATIONS = ["2", "5", "8", "10", "15", "20", "30"] as const;
const WAN_RESOLUTIONS = ["480p", "720p", "1080p"] as const;
const WAN_ASPECT_RATIOS = ["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4"] as const;

const GROK_DURATIONS = ["1", "3", "5", "8", "10", "15"] as const;
const GROK_RESOLUTIONS = ["480p", "720p"] as const;
const GROK_ASPECT_RATIOS = ["auto", "16:9", "4:3", "1:1", "9:16", "3:4", "3:2", "2:3"] as const;

// Hailuo 2.3: 1080p is 6s only, 10s is 768p only. No aspect-ratio option (follows the first frame).
const MINIMAX_DURATIONS = ["6", "10"] as const;
const MINIMAX_RESOLUTIONS = ["768p", "1080p"] as const;
const MINIMAX_ASPECT_RATIOS = [] as const;

export const VIDEO_DURATIONS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  veo: VEO_DURATIONS, seedance: SEEDANCE_DURATIONS, flux: FLUX_DURATIONS, wan: WAN_DURATIONS,
  grok: GROK_DURATIONS, minimax: MINIMAX_DURATIONS, local: FLUX_DURATIONS,
};
export const VIDEO_RESOLUTIONS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  veo: VEO_RESOLUTIONS, seedance: SEEDANCE_RESOLUTIONS, flux: FLUX_RESOLUTIONS, wan: WAN_RESOLUTIONS,
  grok: GROK_RESOLUTIONS, minimax: MINIMAX_RESOLUTIONS, local: FLUX_RESOLUTIONS,
};
export const VIDEO_ASPECT_RATIOS_BY_PROVIDER: Record<VideoGenerationProvider, readonly string[]> = {
  veo: VEO_ASPECT_RATIOS, seedance: SEEDANCE_ASPECT_RATIOS, flux: FLUX_ASPECT_RATIOS, wan: WAN_ASPECT_RATIOS,
  grok: GROK_ASPECT_RATIOS, minimax: MINIMAX_ASPECT_RATIOS, local: FLUX_ASPECT_RATIOS,
};

export const DEFAULT_DURATION_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  veo: "8", seedance: "5", flux: "auto", wan: "5", grok: "5", minimax: "6", local: "auto",
};
export const DEFAULT_RESOLUTION_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  veo: "1080p", seedance: "720p", flux: "720p", wan: "1080p", grok: "720p", minimax: "768p", local: "720p",
};
export const DEFAULT_ASPECT_RATIO_BY_PROVIDER: Record<VideoGenerationProvider, string> = {
  veo: "16:9", seedance: "16:9", flux: "auto", wan: "adaptive", grok: "auto", minimax: "", local: "auto",
};

/** Models that can generate synchronized audio (toolbar shows the speaker toggle). */
export const VIDEO_SUPPORTS_AUDIO: Record<VideoGenerationProvider, boolean> = {
  veo: true, seedance: true, flux: true, wan: false, grok: false, minimax: false, local: false,
};

/** Models with a fast, cheaper draft mode (720p only). */
export const VIDEO_SUPPORTS_DRAFT: Record<VideoGenerationProvider, boolean> = {
  veo: false, seedance: false, flux: true, wan: false, grok: false, minimax: false, local: false,
};

type VideoSettings = { duration?: string; resolution?: string; aspectRatio?: string; audio?: boolean; draft?: boolean };

/**
 * Apply a toolbar change and fix combos the model doesn't allow:
 *  - Hailuo: 1080p is 6s only (picking 10s drops to 768p, picking 1080p drops to 6s)
 *  - Draft is 720p only
 */
export function applyVideoPatch(provider: VideoGenerationProvider, cur: VideoSettings, patch: VideoSettings): VideoSettings {
  const next = { ...cur, ...patch };
  if (provider === "minimax" && next.resolution === "1080p" && next.duration === "10") {
    if (patch.duration !== undefined) next.resolution = "768p";
    else next.duration = "6";
  }
  if (VIDEO_SUPPORTS_DRAFT[provider] && next.draft) next.resolution = "720p";
  return { ...patch, duration: next.duration, resolution: next.resolution };
}

/** Keep the node's current values where the new model supports them, otherwise use that model's defaults. */
export function normalizeVideoSettings(
  provider: VideoGenerationProvider,
  cur: VideoSettings
) {
  const pick = (v: string | undefined, opts: readonly string[], def: string) =>
    v !== undefined && opts.includes(v) ? v : def;
  return {
    duration: pick(cur.duration, VIDEO_DURATIONS_BY_PROVIDER[provider], DEFAULT_DURATION_BY_PROVIDER[provider]),
    resolution: pick(cur.resolution, VIDEO_RESOLUTIONS_BY_PROVIDER[provider], DEFAULT_RESOLUTION_BY_PROVIDER[provider]),
    aspectRatio: pick(cur.aspectRatio, VIDEO_ASPECT_RATIOS_BY_PROVIDER[provider], DEFAULT_ASPECT_RATIO_BY_PROVIDER[provider]),
    audio: VIDEO_SUPPORTS_AUDIO[provider] ? (cur.audio ?? true) : undefined,
    draft: VIDEO_SUPPORTS_DRAFT[provider] ? (cur.draft ?? false) : undefined,
  };
}

// Backward-compatible flat exports.
export const VIDEO_DURATIONS = FLUX_DURATIONS;
export const VIDEO_RESOLUTIONS = FLUX_RESOLUTIONS;
export const VIDEO_ASPECT_RATIOS = FLUX_ASPECT_RATIOS;
export const DEFAULT_VIDEO_DURATION = DEFAULT_DURATION_BY_PROVIDER.flux;
export const DEFAULT_VIDEO_RESOLUTION = DEFAULT_RESOLUTION_BY_PROVIDER.flux;
export const DEFAULT_VIDEO_ASPECT_RATIO = DEFAULT_ASPECT_RATIO_BY_PROVIDER.flux;

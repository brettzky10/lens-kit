/**
 * CREDIT PRICING: the one file to edit.
 *
 * Image and video credits are computed from the provider's USD price:
 *   credits = round(USD x CREDITS_PER_USD x markup)
 *
 * Calibration: your real figure is 1,548 credits for the default Flux 3 clip
 * (720p, "auto" length ~ 6s = $1.02). At 1,500 credits per $1 that's 1,530, within ~1%.
 *   - Reprice everything:      change CREDITS_PER_USD
 *   - Reprice one model:       MODEL_MARKUP["video:veo"] = 1.3  (keys "video:<provider>" / "image:<provider>")
 *   - Provider changed prices: edit the USD tables below
 *
 * Examples at 1,500/$: Seedance 2.5 4s 720p = 1,387 | Veo 3.1 8s with audio = 4,800 |
 * Flux 3 5s 720p = 1,275 | Hailuo 2.3 6s 768p = 420 | Nano Banana Pro 1K = 225
 */
import { DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER } from "./imageOptions";
import { DEFAULT_DURATION_BY_PROVIDER, DEFAULT_RESOLUTION_BY_PROVIDER } from "./videoOptions";
import type { ImageModelProvider, VideoGenerationProvider } from "./providerOptions";

export const CREDITS_PER_USD = 1500;
/** Length assumed when duration is "auto" / "-1" (the model picks). */
export const AUTO_DURATION_SECONDS = 6;
/** Flux 2 bills per input megapixel; connected image sizes aren't known up front. */
export const ASSUMED_INPUT_MEGAPIXELS = 1;

export const MODEL_MARKUP: Record<string, number> = {
  // "video:veo": 1.2,
};
const markup = (key: string) => MODEL_MARKUP[key] ?? 1;
const toCredits = (usd: number, key: string) =>
  Math.max(0, Math.round(usd * CREDITS_PER_USD * markup(key)));

type Rates = Record<string, number>; // keyed by resolution; "*" = any resolution

// ───────────────────────── Video (USD per second of output) ─────────────────────────
interface VideoPricing {
  perSecond?: Rates;
  perSecondVideoInput?: Rates; // a video is connected (video-to-video)
  perSecondSilent?: Rates; // audio turned off
  perSecondDraft?: Rates; // draft mode
  perSecondDraftVideoInput?: Rates; // draft + video-to-video
  flat?: Record<string, number>; // fixed USD per clip, key = `${seconds}s@${resolution}`
}

const VIDEO_USD: Record<VideoGenerationProvider, VideoPricing> = {
  veo: { perSecond: { "*": 0.4 }, perSecondSilent: { "*": 0.2 } },
  seedance: {
    perSecond: { "480p": 0.1028, "720p": 0.2312 },
    perSecondVideoInput: { "480p": 0.4304, "720p": 0.9676 },
  },
  flux: {
    perSecond: { "720p": 0.17, "1080p": 0.29 },
    perSecondVideoInput: { "720p": 0.41, "1080p": 0.53 },
    perSecondDraft: { "720p": 0.06 },
    perSecondDraftVideoInput: { "720p": 0.12 },
  },
  wan: { perSecond: { "480p": 0.025, "720p": 0.05, "1080p": 0.1 } },
  grok: { perSecond: { "*": 0.08 } },
  // Hailuo 2.3: fixed price per clip
  minimax: { flat: { "6s@768p": 0.28, "10s@768p": 0.56, "6s@1080p": 0.49 } },
  local: { perSecond: { "*": 0 } },
};

export interface VideoCostInput {
  duration?: string | number;
  resolution?: string;
  audio?: boolean;
  draft?: boolean;
  hasVideoInput?: boolean;
}

export function videoCost(provider: string, i: VideoCostInput = {}): number {
  const p = (provider in VIDEO_USD ? provider : "flux") as VideoGenerationProvider;
  const res = (i.resolution ?? DEFAULT_RESOLUTION_BY_PROVIDER[p]).toLowerCase();
  const d = i.duration ?? DEFAULT_DURATION_BY_PROVIDER[p];
  const n = Number(d);
  const secs = d === "auto" || d === "-1" || d === -1 || !Number.isFinite(n) || n <= 0 ? AUTO_DURATION_SECONDS : n;

  const t = VIDEO_USD[p];
  if (t.flat) return toCredits(t.flat[`${secs}s@${res}`] ?? 0, `video:${p}`);

  const pick = (r?: Rates) => r?.[res] ?? r?.["*"];
  let rate = pick(t.perSecond) ?? 0;
  if (i.draft && t.perSecondDraft) {
    rate = (i.hasVideoInput ? pick(t.perSecondDraftVideoInput) : undefined) ?? pick(t.perSecondDraft) ?? rate;
  } else if (i.hasVideoInput && t.perSecondVideoInput) {
    rate = pick(t.perSecondVideoInput) ?? rate;
  } else if (i.audio === false && t.perSecondSilent) {
    rate = pick(t.perSecondSilent) ?? rate;
  }
  return toCredits(rate * secs, `video:${p}`);
}

// ───────────────────────── Image ─────────────────────────
interface ImagePricing {
  perImage?: Rates;
  perRunUsd?: number;
  perInputMegapixelUsd?: number;
  perOutputMegapixelUsd?: number;
}

const IMAGE_USD: Record<ImageModelProvider, ImagePricing> = {
  nanobanana: { perImage: { "1K": 0.15, "2K": 0.15, "4K": 0.3 } },
  // Flux 2 Pro: $0.015 per run + $0.015 per input MP + $0.015 per output MP
  flux: { perRunUsd: 0.015, perInputMegapixelUsd: 0.015, perOutputMegapixelUsd: 0.015 },
  grok: { perImage: { "*": 0.04 } },
  local: { perImage: { "*": 0 } },
};

export interface ImageCostInput {
  resolution?: string;
  inputImages?: number;
}

export function imageCost(provider: string, i: ImageCostInput = {}): number {
  const p = (provider in IMAGE_USD ? provider : "flux") as ImageModelProvider;
  const res = i.resolution ?? DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER[p];
  const t = IMAGE_USD[p];
  const inMP = (i.inputImages ?? 0) * ASSUMED_INPUT_MEGAPIXELS;
  const outMP = /MP$/i.test(res) ? parseFloat(res) : Math.min(4, Math.max(0.5, inMP || 1));
  const usd =
    (t.perRunUsd ?? 0) +
    (t.perImage?.[res] ?? t.perImage?.["*"] ?? 0) +
    (t.perInputMegapixelUsd ?? 0) * inMP +
    (t.perOutputMegapixelUsd ?? 0) * outMP;
  return toCredits(usd, `image:${p}`);
}

// ───────────────────────── Other nodes (flat credits, unchanged placeholders) ─────────────────────────
export const CREDIT_COSTS = {
  sheet: { flux: 60, local: 0 }, // Character / Object / Location
  upscale: { flux: 250, local: 0 },
  edit: { flux: 500, local: 0 },
} as const;

export type CreditCategory = "image" | "video" | "sheet" | "upscale" | "edit";

/** Backward-compatible. For image/video this returns the cost of that model's default settings. */
export function costFor(category: CreditCategory, provider: string): number {
  if (category === "image") return imageCost(provider);
  if (category === "video") return videoCost(provider);
  const table = CREDIT_COSTS[category] as Record<string, number>;
  return table[provider] ?? 0;
}

import type { ImageModelProvider } from "./providerOptions";

const NB_ASPECTS = ["match_input_image", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] as const;
const NB_RES = ["1K", "2K", "4K"] as const;

const FLUX_ASPECTS = ["match_input_image", "1:1", "16:9", "3:2", "2:3", "4:5", "5:4", "9:16", "3:4", "4:3"] as const;
const FLUX_RES = ["match_input_image", "0.5 MP", "1 MP", "2 MP", "4 MP"] as const;

const GROK_ASPECTS = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "19.5:9", "9:19.5", "20:9", "9:20"] as const;
const GROK_RES = ["1k", "2k"] as const;

export const IMAGE_ASPECT_RATIOS_BY_PROVIDER: Record<ImageModelProvider, readonly string[]> = {
  nanobanana: NB_ASPECTS, flux: FLUX_ASPECTS, grok: GROK_ASPECTS, local: FLUX_ASPECTS,
};
export const IMAGE_RESOLUTIONS_BY_PROVIDER: Record<ImageModelProvider, readonly string[]> = {
  nanobanana: NB_RES, flux: FLUX_RES, grok: GROK_RES, local: FLUX_RES,
};
export const DEFAULT_IMAGE_ASPECT_BY_PROVIDER: Record<ImageModelProvider, string> = {
  nanobanana: "16:9", flux: "1:1", grok: "1:1", local: "1:1",
};
export const DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER: Record<ImageModelProvider, string> = {
  nanobanana: "1K", flux: "1 MP", grok: "2k", local: "1 MP",
};

export function normalizeImageSettings(
  provider: ImageModelProvider,
  cur: { aspectRatio?: string; resolution?: string }
) {
  const pick = (v: string | undefined, opts: readonly string[], def: string) =>
    v !== undefined && opts.includes(v) ? v : def;
  return {
    aspectRatio: pick(cur.aspectRatio, IMAGE_ASPECT_RATIOS_BY_PROVIDER[provider], DEFAULT_IMAGE_ASPECT_BY_PROVIDER[provider]),
    resolution: pick(cur.resolution, IMAGE_RESOLUTIONS_BY_PROVIDER[provider], DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER[provider]),
  };
}

/** CSS aspect-ratio for the preview box. Non-numeric values ("auto", "match_input_image") fall back to 16:9. */
export function aspectToCss(ratio?: string): string {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio ?? "");
  return m ? `${m[1]} / ${m[2]}` : "16 / 9";
}

export const CREATIVITY_OPTIONS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: "Precise (0) — faces, products, real people" },
  { value: 1, label: "Creative (1) — generated footage, textures, scenery" },
];

export const UPSCALE_FACTORS = [1.5, 2, 2.5, 3] as const;

export const SAFETY_TOLERANCES = [0, 1, 2, 3, 4] as const;

export const DEFAULT_CREATIVITY: 0 | 1 = 1;
export const DEFAULT_UPSCALE_FACTOR = 2;
export const DEFAULT_SAFETY_TOLERANCE = 2;

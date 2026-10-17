// lib/plans.ts
// Safe to import from client components: only env var NAMES live here, never values.

export type PaidPlan = "PRO" | "ULTIMATE";
export type PlanKey = "STANDARD" | PaidPlan;

export interface PlanConfig {
  label: string;
  displayPrice: string;
  /** Name of the env var holding this plan's Stripe Price ID (server-side). */
  priceEnvVar: string;
  creditsPerMonth: number;
  features: string[];
}

export const FREE_CREDITS_PER_MONTH = 1_000;

/** Unused monthly credits roll over, up to this many months' worth of the plan. */
export const MAX_ROLLOVER_MONTHS = 3;

/** Most credits a monthly grant can build up to (Pro 300k, Ultimate 1.5M, Standard 3k). */
export function maxCarry(creditsPerMonth: number): number {
  return creditsPerMonth * MAX_ROLLOVER_MONTHS;
}

// STANDARD = free plan, no Stripe subscription.
export const FREE_PLAN: Omit<PlanConfig, "priceEnvVar"> = {
  label: "Standard",
  displayPrice: "Free",
  creditsPerMonth: FREE_CREDITS_PER_MONTH,
  features: [`${FREE_CREDITS_PER_MONTH.toLocaleString("en-US")} credits every month`, "Core editor"],
};

// ⚠️ Placeholder prices/credits/features — edit to match your Stripe products.
export const PLAN_CONFIGS: Record<PaidPlan, PlanConfig> = {
  PRO: {
    label: "Pro",
    displayPrice: "$19/month",
    priceEnvVar: "STRIPE_PRICE_PRO",
    creditsPerMonth: 100_000,
    features: ["100,000 credits every month", "Priority rendering", "Buy extra credit packs"],
  },
  ULTIMATE: {
    label: "Ultimate",
    displayPrice: "$49/month",
    priceEnvVar: "STRIPE_PRICE_ULTIMATE",
    creditsPerMonth: 500_000,
    features: ["500,000 credits every month", "Fastest rendering", "Buy extra credit packs"],
  },
};

export const PLAN_RANK: Record<PlanKey, number> = { STANDARD: 0, PRO: 1, ULTIMATE: 2 };

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "PRO" || value === "ULTIMATE";
}

/** Server-side: map a Stripe Price ID back to the plan it belongs to. */
export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PLAN_CONFIGS) as PaidPlan[]) {
    if (process.env[PLAN_CONFIGS[plan].priceEnvVar] === priceId) return plan;
  }
  return null;
}

// One-time credit packs. Each needs a one-time Price in Stripe.
// ⚠️ Placeholder amounts — edit freely.
export interface CreditPack {
  id: string;
  credits: number;
  displayPrice: string;
  priceEnvVar: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "small", credits: 5_000, displayPrice: "$5", priceEnvVar: "STRIPE_PRICE_CREDITS_SMALL" },
  { id: "medium", credits: 25_000, displayPrice: "$20", priceEnvVar: "STRIPE_PRICE_CREDITS_MEDIUM" },
  { id: "large", credits: 100_000, displayPrice: "$60", priceEnvVar: "STRIPE_PRICE_CREDITS_LARGE" },
];

export function getCreditPack(id: unknown): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null;
}
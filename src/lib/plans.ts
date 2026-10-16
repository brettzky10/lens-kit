export type PaidPlan = "PRO" | "ULTIMATE";

export interface PlanConfig {
  plan: PaidPlan;
  label: string;
  // Credits granted on subscribe and again every renewal.
  creditsPerMonth: number;
  // The env var holding this plan's Stripe recurring Price ID — set these
  // up in your Stripe Dashboard (Product with a monthly recurring Price)
  // and put the Price ID (starts with "price_...") in .env.local.
  priceEnvVar: "STRIPE_PRICE_PRO" | "STRIPE_PRICE_ULTIMATE";
  // Display-only — I don't know what you actually want to charge, so
  // these are placeholders. This is purely cosmetic text on the billing
  // page; the REAL price charged is whatever the Stripe Price (above) is
  // configured for. Keep these in sync with that Price yourself.
  displayPrice: string;
  features: string[];
}

export const PLAN_CONFIGS: Record<PaidPlan, PlanConfig> = {
  PRO: {
    plan: "PRO",
    label: "Pro",
    creditsPerMonth: 25000,
    priceEnvVar: "STRIPE_PRICE_PRO",
    displayPrice: "$29/mo",
    features: [
      "25,000 credits every month",
      "All video/image providers",
      "Priority support",
    ],
  },
  ULTIMATE: {
    plan: "ULTIMATE",
    label: "Ultimate",
    creditsPerMonth: 100000,
    priceEnvVar: "STRIPE_PRICE_ULTIMATE",
    displayPrice: "$99/mo",
    features: [
      "100,000 credits every month",
      "All video/image providers",
      "Priority support",
      "Early access to new node types",
    ],
  },
};

export function isPaidPlan(value: string): value is PaidPlan {
  return value === "PRO" || value === "ULTIMATE";
}

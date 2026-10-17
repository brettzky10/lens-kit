// app/api/billing/change-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLAN_CONFIGS, PLAN_RANK, isPaidPlan, maxCarry } from "@/lib/plans";
import { addTopUpCredits } from "@/lib/actions/credits";
import { getPeriodEnd, getPeriodStart } from "@/lib/actions/billing";

/**
 * Switch between PRO and ULTIMATE.
 *
 * Upgrade   → effective now. Stripe charges the prorated difference immediately,
 *             and we grant the same prorated share of the extra monthly credits
 *             (so upgrading on day 29 can't farm a full month of credits),
 *             limited by the new plan's rollover cap.
 * Downgrade → effective now, no refund and no credit clawback. The lower price
 *             and lower monthly credits start at the next renewal.
 */
export async function POST(req: NextRequest) {
  const { plan } = await req.json().catch(() => ({}));
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: authUser.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }
  if (subscription.status === "PAST_DUE") {
    return NextResponse.json({ error: "Update your payment method before changing plans." }, { status: 409 });
  }
  if (subscription.cancelAtPeriodEnd) {
    return NextResponse.json({ error: "Resume your subscription before changing plans." }, { status: 409 });
  }
  // Prisma types subscription.plan as the full Plan enum (incl. STANDARD);
  // narrow it to a paid plan so it can index PLAN_CONFIGS.
  const currentPlan = subscription.plan;
  if (!isPaidPlan(currentPlan)) {
    return NextResponse.json({ error: "Subscription has an unexpected plan." }, { status: 500 });
  }
  if (currentPlan === plan) {
    return NextResponse.json({ error: "You're already on this plan." }, { status: 400 });
  }

  const newPriceId = process.env[PLAN_CONFIGS[plan].priceEnvVar];
  if (!newPriceId) {
    return NextResponse.json({ error: `Missing ${PLAN_CONFIGS[plan].priceEnvVar} in the server environment.` }, { status: 500 });
  }

  const upgrading = PLAN_RANK[plan] > PLAN_RANK[currentPlan];

  try {
    const current = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const item = current.items.data[0];

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: upgrading ? "always_invoice" : "none",
      // If the prorated upgrade charge fails, Stripe throws and nothing changes.
      payment_behavior: "error_if_incomplete",
      metadata: { plan },
    });

    const periodStart = getPeriodStart(updated);
    const periodEnd = getPeriodEnd(updated);

    let bonusCredits = 0;
    if (upgrading) {
      const diff = PLAN_CONFIGS[plan].creditsPerMonth - PLAN_CONFIGS[currentPlan].creditsPerMonth;
      const total = periodEnd.getTime() - periodStart.getTime();
      const remaining = Math.min(1, Math.max(0, (periodEnd.getTime() - Date.now()) / total));
      bonusCredits = Math.round(diff * remaining);
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { plan, stripePriceId: newPriceId, currentPeriodEnd: periodEnd },
      });
      await tx.user.update({ where: { id: subscription.userId }, data: { plan } });
      if (bonusCredits > 0) {
        // Same rollover limit as monthly grants, using the NEW plan's cap.
        await addTopUpCredits(tx, subscription.userId, bonusCredits, maxCarry(PLAN_CONFIGS[plan].creditsPerMonth));
      }
    });

    return NextResponse.json({ ok: true, bonusCredits });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    console.error("change-plan failed:", err);
    return NextResponse.json({ error: "Could not change plan." }, { status: 500 });
  }
}
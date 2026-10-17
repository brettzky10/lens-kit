// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLAN_CONFIGS, isPaidPlan } from "@/lib/plans";
import { getOrCreateUser } from "@/lib/actions/user";
import { getOrCreateStripeCustomer } from "@/lib/actions/billing";

// Starts a NEW subscription. Switching between paid plans goes through
// /api/billing/change-plan instead.
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

  const config = PLAN_CONFIGS[plan];
  const priceId = process.env[config.priceEnvVar];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing ${config.priceEnvVar} in the server environment — create a monthly recurring Price for this plan in your Stripe Dashboard and set its Price ID.` },
      { status: 500 }
    );
  }

  const user = await getOrCreateUser(authUser);

  // Block double-subscribing (PAST_DUE counts: they still have a subscription).
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a subscription. Use change plan instead." },
      { status: 409 }
    );
  }

  const customerId = await getOrCreateStripeCustomer(user);
  const origin = req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=canceled`,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLAN_CONFIGS, isPaidPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const { plan } = await req.json();

  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = createClient();
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

  let user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) {
    const meta = authUser.user_metadata as Record<string, unknown> | undefined;
    user = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? `${authUser.id}@unknown.local`,
        name:
          (meta?.full_name as string | undefined) ??
          (meta?.name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "User",
        image: (meta?.avatar_url as string | undefined) ?? "",
        credits: 1000,
      },
    });
  }

  // Reuse an existing Stripe Customer for this user, or create one.
  let stripeCustomerId = user.stripeId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeId: stripeCustomerId } });
  }

  const origin = req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
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

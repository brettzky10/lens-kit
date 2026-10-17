// app/api/billing/buy-credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getCreditPack } from "@/lib/plans";
import { getOrCreateUser } from "@/lib/actions/user";
import { getOrCreateStripeCustomer } from "@/lib/actions/billing";

export async function POST(req: NextRequest) {
  const { packId } = await req.json().catch(() => ({}));
  const pack = getCreditPack(packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const priceId = process.env[pack.priceEnvVar];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing ${pack.priceEnvVar} in the server environment — create a one-time Price for this pack in Stripe and set its Price ID.` },
      { status: 500 }
    );
  }

  const user = await getOrCreateUser(authUser);
  const customerId = await getOrCreateStripeCustomer(user);
  const origin = req.nextUrl.origin;
  const metadata = { userId: user.id, type: "credit_pack", packId: pack.id };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?credits=success`,
    cancel_url: `${origin}/billing?credits=canceled`,
    metadata,
    payment_intent_data: { metadata },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
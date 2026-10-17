// app/api/billing/cancel/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: authUser.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  // Graceful cancellation: access continues until the period they already
  // paid for ends, rather than cutting them off immediately.
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  const periodEndUnix = (updated as any).current_period_end as number | undefined;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: true,
      endDate: periodEndUnix ? new Date(periodEndUnix * 1000) : subscription.currentPeriodEnd,
    },
  });

  return NextResponse.json({ ok: true });
}
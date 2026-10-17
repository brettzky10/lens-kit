// app/api/billing/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/actions/user";
import { cycleTotal } from "@/lib/actions/credits";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ signedIn: false });
  }

  const user = await getOrCreateUser(authUser);
  // PAST_DUE still counts as "has a subscription" so the UI can prompt to fix payment.
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    signedIn: true,
    credits: user.credits,
    creditsTotal: cycleTotal(user),
    plan: user.plan,
    // Paid: the renewal date. Free: when the next free grant lands.
    nextGrantAt: subscription
      ? subscription.cancelAtPeriodEnd
        ? null
        : subscription.currentPeriodEnd
      : user.nextFreeGrantAt,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          endDate: subscription.endDate,
        }
      : null,
  });
}
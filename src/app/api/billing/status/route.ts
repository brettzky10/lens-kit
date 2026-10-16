import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ signedIn: false });
  }

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  const subscription = await prisma.subscription.findFirst({
    where: { userId: authUser.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    signedIn: true,
    credits: user?.credits ?? 0,
    subscription: subscription
      ? {
          plan: subscription.plan,
          startDate: subscription.startDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          endDate: subscription.endDate,
        }
      : null,
  });
}

// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user?.stripeId) {
    return NextResponse.json({ error: "No billing account yet." }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeId,
    return_url: `${req.nextUrl.origin}/billing`,
  });
  return NextResponse.json({ url: session.url });
}
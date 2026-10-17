// app/api/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  return NextResponse.json({
    signedIn: true,
    credits: user.credits,
    creditsTotal: cycleTotal(user),
    plan: user.plan,
  });
}
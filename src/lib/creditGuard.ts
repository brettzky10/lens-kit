import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/actions/user";

export interface CreditGuardSuccess {
  ok: true;
  userId: string;
}
export interface CreditGuardFailure {
  ok: false;
  response: NextResponse;
}
export type CreditGuardResult = CreditGuardSuccess | CreditGuardFailure;

/**
 * Every generation API route calls this first. Returns { ok: false,
 * response } if the caller isn't signed in (401) or doesn't have enough
 * credits (402) — the route should `return result.response` immediately in
 * either case. Otherwise returns { ok: true, userId }; the route should
 * proceed with generation and call deductCredits(userId, cost) only after
 * a successful result.
 */
export async function requireCredits(cost: number): Promise<CreditGuardResult> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated", message: "Sign in to generate." },
        { status: 401 }
      ),
    };
  }

  // Creates the Prisma row on first sight (0 credits) and applies the free
  // monthly grant if one is due, so user.credits below is already up to date.
  const user = await getOrCreateUser(authUser);

  if (cost > 0 && user.credits < cost) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "insufficient_credits",
          message: `This action costs ${cost} credits — you have ${user.credits}.`,
          credits: user.credits,
          required: cost,
        },
        { status: 402 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}

/** Call only after a generation call actually succeeds. Returns the new balance. */
export async function deductCredits(userId: string, cost: number): Promise<number> {
  if (cost <= 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.credits ?? 0;
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: cost } },
  });
  return updated.credits;
}

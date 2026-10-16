import { Prisma, type User } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { grantFreeCreditsIfDue } from "@/lib/actions/credits";

/**
 * Single entry point for "give me the DB user for this Supabase user".
 * Creates the row on first sight and applies the free monthly grant if due.
 * Use it anywhere you read or spend credits (including your credit guard).
 * New users start at 0 — the free grant gives them their first credits.
 */
export async function getOrCreateUser(authUser: SupabaseUser): Promise<User> {
  let user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (!user) {
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    try {
      user = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email ?? `${authUser.id}@unknown.local`,
          name:
            (meta.full_name as string | undefined) ??
            (meta.name as string | undefined) ??
            authUser.email?.split("@")[0] ??
            "User",
          image: (meta.avatar_url as string | undefined) ?? "",
          credits: 0,
          creditsCycleTotal: 0,
        },
      });
    } catch (err) {
      // Two requests raced to create the same user — just read the winner.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        user = await prisma.user.findUnique({ where: { id: authUser.id } });
      } else {
        throw err;
      }
    }
    if (!user) throw new Error("A user with this email already exists under a different account id.");
  }

  return grantFreeCreditsIfDue(user);
}

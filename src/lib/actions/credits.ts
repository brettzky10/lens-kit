import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_PER_MONTH, maxCarry } from "@/lib/actions/plans";

type Tx = Prisma.TransactionClient;

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * How much of `amount` fits under `cap` given the current balance.
 * Never negative, so a balance already above the cap (bought packs, or a
 * downgrade) is left alone — it just receives nothing until it drops below.
 */
async function cappedAmount(tx: Tx, userId: string, amount: number, cap: number) {
  const { credits } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
  return Math.max(0, Math.min(amount, cap - credits));
}

/**
 * Start of a new monthly cycle. Adds the plan's monthly credits, but the
 * balance can't grow past `cap` (3 months' worth of the plan). Then resets
 * creditsCycleTotal to the new balance, so "used" starts at 0%.
 *
 * Uses an atomic `increment` (not `set`) so a credit spend happening at the
 * same moment is never overwritten.
 */
export async function grantCycleCredits(tx: Tx, userId: string, amount: number, cap: number) {
  const granted = await cappedAmount(tx, userId, amount, cap);
  const { credits } = await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: granted } },
    select: { credits: true },
  });
  await tx.user.update({ where: { id: userId }, data: { creditsCycleTotal: credits } });
}

/**
 * Mid-cycle top-up that counts toward this cycle's total.
 * - Credit packs: no cap (the customer paid for them; they're never removed).
 * - Upgrade bonus: pass the new plan's cap.
 */
export async function addTopUpCredits(tx: Tx, userId: string, amount: number, cap?: number) {
  const granted = cap === undefined ? amount : await cappedAmount(tx, userId, amount, cap);
  if (granted <= 0) return;
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: granted }, creditsCycleTotal: { increment: granted } },
  });
}

/**
 * Free (STANDARD) plan monthly grant. Lazy: runs whenever we load the user, so
 * no cron job is needed. The updateMany "claim" makes it safe under concurrent
 * requests — only one request wins and grants.
 */
export async function grantFreeCreditsIfDue(user: User): Promise<User> {
  const now = new Date();
  if (user.plan !== "STANDARD" || user.nextFreeGrantAt > now) return user;

  const granted = await prisma.$transaction(async (tx) => {
    const claim = await tx.user.updateMany({
      where: { id: user.id, plan: "STANDARD", nextFreeGrantAt: { lte: now } },
      data: { nextFreeGrantAt: addMonths(now, 1) },
    });
    if (claim.count === 0) return false;
    await grantCycleCredits(tx, user.id, FREE_CREDITS_PER_MONTH, maxCarry(FREE_CREDITS_PER_MONTH));
    return true;
  });

  return granted ? prisma.user.findUniqueOrThrow({ where: { id: user.id } }) : user;
}

/** Credits available this cycle. Guards users created before creditsCycleTotal existed. */
export function cycleTotal(user: Pick<User, "credits" | "creditsCycleTotal">) {
  return Math.max(user.creditsCycleTotal, user.credits);
}

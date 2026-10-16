import type { User } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/** Reuse the user's Stripe Customer, or create one. */
export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (user.stripeId) return user.stripeId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { stripeId: customer.id } });
  return customer.id;
}

// Newer Stripe API versions moved period dates onto subscription items and the
// invoice's subscription under `parent`. These helpers work with either shape.

export function getPeriodEnd(sub: Stripe.Subscription): Date {
  const s = sub as any;
  const unix: number | undefined = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  if (!unix) throw new Error(`Stripe subscription ${sub.id} has no current period end`);
  return new Date(unix * 1000);
}

export function getPeriodStart(sub: Stripe.Subscription): Date {
  const s = sub as any;
  const unix: number | undefined = s.current_period_start ?? s.items?.data?.[0]?.current_period_start;
  if (!unix) throw new Error(`Stripe subscription ${sub.id} has no current period start`);
  return new Date(unix * 1000);
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const i = invoice as any;
  const sub = i.subscription ?? i.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

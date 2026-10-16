import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Prisma, type SubscriptionStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_CONFIGS, getCreditPack, isPaidPlan, maxCarry, planFromPriceId } from "@/lib/actions/plans";
import { addMonths, addTopUpCredits, grantCycleCredits } from "@/lib/actions/credits";
import { getInvoiceSubscriptionId, getPeriodEnd } from "@/lib/actions/billing";

// Needs the Node runtime for signature verification and must read the RAW body.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type}:`, err);
    // 500 makes Stripe retry — better than silently dropping a billing event.
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* -------------------------------------------------------------------------- */
/* Checkout completed: new subscription OR one-time credit pack               */
/* -------------------------------------------------------------------------- */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription" && session.subscription) {
    // Creates the Subscription row. Credits are granted by invoice.paid, not here.
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    await upsertSubscriptionFromStripe(await stripe.subscriptions.retrieve(id));
    return;
  }

  if (session.mode === "payment" && session.metadata?.type === "credit_pack") {
    await handleCreditPackPurchase(session);
  }
}

async function handleCreditPackPurchase(session: Stripe.Checkout.Session) {
  // For delayed payment methods, "completed" fires before the money arrives;
  // async_payment_succeeded fires later and lands here again.
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId;
  const pack = getCreditPack(session.metadata?.packId);
  if (!userId || !pack) {
    console.error("Credit pack session missing userId/packId metadata", session.id);
    return;
  }

  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  try {
    await prisma.$transaction(async (tx) => {
      // stripePaymentId is UNIQUE: a duplicate/retried delivery fails here and
      // rolls back, so credits can never be granted twice for one payment.
      await tx.payment.create({
        data: {
          userId,
          amount: (session.amount_total ?? 0) / 100,
          currency: session.currency ?? "usd",
          stripePaymentId: paymentId,
        },
      });
      await addTopUpCredits(tx, userId, pack.credits);
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Subscription lifecycle                                                     */
/* -------------------------------------------------------------------------- */

/** Source of truth sync: builds/updates our Subscription row from Stripe's. */
async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  const priceId = sub.items.data[0]?.price.id ?? "";
  const metaPlan = sub.metadata?.plan;
  const plan = planFromPriceId(priceId) ?? (isPaidPlan(metaPlan) ? metaPlan : null);

  if (!userId || !plan) {
    console.error(`Subscription ${sub.id} missing userId/plan — ignoring.`);
    return null;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = getPeriodEnd(sub);
  const status = mapStripeStatus(sub.status);
  const endDate = sub.ended_at
    ? new Date(sub.ended_at * 1000)
    : sub.cancel_at_period_end
      ? periodEnd
      : null;

  const row = await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      plan,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      startDate: new Date(sub.start_date * 1000),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      endDate,
    },
    update: {
      plan,
      status,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      endDate,
    },
  });

  if (status === "ACTIVE" || status === "PAST_DUE") {
    await prisma.user.update({ where: { id: userId }, data: { plan } });
  }
  return row;
}

/**
 * Fires for EVERY paid invoice. We grant the monthly credits only for the first
 * invoice (subscription_create) and renewals (subscription_cycle). Invoices from
 * plan changes (subscription_update) are skipped — change-plan handles those.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return; // one-off invoice

  if (invoice.billing_reason !== "subscription_create" && invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  let subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!subscription) {
    // Stripe doesn't guarantee event order: invoice.paid can beat
    // checkout.session.completed. Build the row from Stripe rather than skipping.
    const row = await upsertSubscriptionFromStripe(await stripe.subscriptions.retrieve(subscriptionId));
    if (!row) return;
    subscription = row;
  }

  const config = PLAN_CONFIGS[subscription.plan as keyof typeof PLAN_CONFIGS];
  if (!config) {
    console.error(`Unknown plan on subscription ${subscription.id}: ${subscription.plan}`);
    return;
  }

  const periodEndUnix = (invoice.lines.data[0] as any)?.period?.end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : subscription.currentPeriodEnd;

  await prisma.$transaction(async (tx) => {
    // Atomic claim: only one delivery can flip lastCreditedInvoiceId to this
    // invoice, so retried/duplicate deliveries grant nothing.
    const claim = await tx.subscription.updateMany({
      where: {
        id: subscription!.id,
        OR: [{ lastCreditedInvoiceId: null }, { lastCreditedInvoiceId: { not: invoice.id } }],
      },
      data: { lastCreditedInvoiceId: invoice.id, currentPeriodEnd, status: "ACTIVE" },
    });
    if (claim.count === 0) return;
    await grantCycleCredits(tx, subscription!.userId, config.creditsPerMonth, maxCarry(config.creditsPerMonth));
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  if (!existing) return;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "CANCELED", endDate: new Date() },
    }),
    // Back to the free plan. Credits already granted stay; free grants resume
    // one month from now so they can't double-dip right after a paid cycle.
    prisma.user.update({
      where: { id: existing.userId },
      data: { plan: "STANDARD", nextFreeGrantAt: addMonths(new Date(), 1) },
    }),
  ]);
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

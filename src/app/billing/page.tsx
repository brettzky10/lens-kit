"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clapperboard, Check, Coins, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  CREDIT_PACKS,
  FREE_PLAN,
  PLAN_CONFIGS,
  PLAN_RANK,
  maxCarry,
  type PaidPlan,
  type PlanKey,
} from "@/lib/actions/plans";
import { cn } from "@/lib/utils";

interface SubscriptionInfo {
  plan: PaidPlan;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  startDate: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  endDate: string | null;
}

interface BillingStatus {
  signedIn: boolean;
  credits?: number;
  creditsTotal?: number;
  plan?: PlanKey;
  nextGrantAt?: string | null;
  subscription?: SubscriptionInfo | null;
}

const nf = new Intl.NumberFormat("en-US");

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function BillingContent() {
  const { user, loading: authLoading, refreshCredits } = useAuth();
  const searchParams = useSearchParams();
  const checkoutResult = searchParams.get("checkout");
  const creditsResult = searchParams.get("credits");

  const [status, setStatus] = React.useState<BillingStatus | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async (silent = false) => {
    if (!silent) setStatusLoading(true);
    try {
      const res = await fetch("/api/billing/status");
      setStatus(await res.json());
    } catch {
      setError("Couldn't load billing status.");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user) loadStatus();
    else setStatusLoading(false);
  }, [user, loadStatus]);

  // Stripe webhooks are fast but not synchronous with the redirect back here,
  // so re-check a few times after a successful payment.
  React.useEffect(() => {
    if (checkoutResult !== "success" && creditsResult !== "success") return;
    const timers = [1500, 4000, 9000].map((ms) =>
      setTimeout(() => {
        loadStatus(true);
        refreshCredits();
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [checkoutResult, creditsResult, loadStatus, refreshCredits]);

  async function call(key: string, url: string, body?: unknown, successNotice?: string) {
    setError(null);
    setNotice(null);
    setActionLoading(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      if (json.url) {
        window.location.href = json.url; // Stripe Checkout / portal — keep the spinner while redirecting
        return;
      }
      await loadStatus(true);
      await refreshCredits();
      if (successNotice) setNotice(successNotice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setActionLoading(null);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Sign in to manage your plan and credits.</p>
        <Button >
          <Link href="/signin?redirect=/billing">Sign in</Link>
        </Button>
      </main>
    );
  }

  const subscription = status?.subscription ?? null;
  const currentPlan: PlanKey = subscription?.plan ?? "STANDARD";
  const pastDue = subscription?.status === "PAST_DUE";
  const ending = !!subscription?.cancelAtPeriodEnd;

  const credits = status?.credits ?? 0;
  const total = Math.max(status?.creditsTotal ?? 0, credits, 1);
  const used = Math.max(0, total - credits);
  const percent = Math.min(100, Math.round((used / total) * 100));
  const rolloverCap = maxCarry(subscription ? PLAN_CONFIGS[subscription.plan].creditsPerMonth : FREE_PLAN.creditsPerMonth);

  let refillText = "";
  if (subscription && ending) refillText = `Plan ends ${formatDate(subscription.endDate ?? subscription.currentPeriodEnd)}`;
  else if (subscription) refillText = `Renews ${formatDate(subscription.currentPeriodEnd)}`;
  else if (status?.nextGrantAt) refillText = `Free credits refill ${formatDate(status.nextGrantAt)}`;

  function planButton(target: PlanKey) {
    if (target === currentPlan) {
      return (
        <Button variant="outline" disabled>
          Current plan
        </Button>
      );
    }

    if (target === "STANDARD") {
      return (
        <Button
          variant="outline"
          disabled={ending || pastDue || actionLoading === "cancel"}
          onClick={() => {
            if (window.confirm("Downgrade to Standard? You keep your paid plan until the end of this billing period.")) {
              call("cancel", "/api/billing/cancel");
            }
          }}
        >
          {actionLoading === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {ending ? "Scheduled" : "Downgrade to Standard"}
        </Button>
      );
    }

    const key = `plan:${target}`;
    const label = PLAN_CONFIGS[target].label;

    if (!subscription) {
      return (
        <Button disabled={!!actionLoading} onClick={() => call(key, "/api/billing/checkout", { plan: target })}>
          {actionLoading === key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Subscribe to {label}
        </Button>
      );
    }

    const upgrading = PLAN_RANK[target] > PLAN_RANK[currentPlan];
    return (
      <Button
        variant={upgrading ? "default" : "secondary"}
        disabled={!!actionLoading || ending || pastDue}
        onClick={() => {
          const msg = upgrading
            ? `Upgrade to ${label}? You'll be charged the prorated difference now and get a prorated share of the extra monthly credits.`
            : `Downgrade to ${label}? It takes effect now with no refund, and the lower monthly credits start at your next renewal.`;
          if (window.confirm(msg)) {
            call(key, "/api/billing/change-plan", { plan: target }, `You're now on ${label}.`);
          }
        }}
      >
        {actionLoading === key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {upgrading ? "Upgrade" : "Downgrade"} to {label}
      </Button>
    );
  }

  const cards: { key: PlanKey; label: string; price: string; credits: number; features: string[] }[] = [
    { key: "STANDARD", label: FREE_PLAN.label, price: FREE_PLAN.displayPrice, credits: FREE_PLAN.creditsPerMonth, features: FREE_PLAN.features },
    ...(Object.keys(PLAN_CONFIGS) as PaidPlan[]).map((k) => ({
      key: k as PlanKey,
      label: PLAN_CONFIGS[k].label,
      price: PLAN_CONFIGS[k].displayPrice,
      credits: PLAN_CONFIGS[k].creditsPerMonth,
      features: PLAN_CONFIGS[k].features,
    })),
  ];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/flow" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to editor</span>
        </Link>
        <div className="flex items-center gap-2 text-primary">
          <Clapperboard className="h-5 w-5" />
          <span className="text-sm font-semibold text-foreground">CineFlow</span>
        </div>
      </div>

      <h1 className="mb-1 text-xl font-semibold text-foreground">Billing</h1>
      <p className="mb-6 text-sm text-muted-foreground">Manage your plan, credits, and payment details.</p>

      {checkoutResult === "canceled" && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          Checkout was canceled — no charge was made.
        </div>
      )}
      {creditsResult === "canceled" && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          Purchase canceled — no charge was made.
        </div>
      )}
      {(checkoutResult === "success" || creditsResult === "success") && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          Payment received. Your credits will appear in a few seconds.
        </div>
      )}
      {notice && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{notice}</div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {pastDue && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Your last payment failed. Update your payment method to keep your plan.
          </span>
          <Button size="sm" variant="destructive" disabled={actionLoading === "portal"} onClick={() => call("portal", "/api/billing/portal")}>
            {actionLoading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update payment method
          </Button>
        </div>
      )}
      {subscription && ending && !pastDue && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          <span>
            Your {PLAN_CONFIGS[subscription.plan].label} plan ends on{" "}
            {formatDate(subscription.endDate ?? subscription.currentPeriodEnd)}. You keep access until then.
          </span>
          <Button size="sm" variant="secondary" disabled={actionLoading === "resume"} onClick={() => call("resume", "/api/billing/resume")}>
            {actionLoading === "resume" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resume subscription
          </Button>
        </div>
      )}
      
      {statusLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Credits */}
          <section className="mb-10 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Coins className="h-4 w-4 text-primary" />
                Credits
              </div>
              {refillText && <span className="text-sm text-muted-foreground">{refillText}</span>}
            </div>
            <div className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
              {nf.format(credits)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">of {nf.format(total)} this cycle</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Credits used this cycle"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{nf.format(used)} used</span>
              <span>Unused monthly credits roll over up to {nf.format(rolloverCap)}</span>
            </div>
          </section>

          {/* Plans */}
          <h2 className="mb-3 text-base font-semibold text-foreground">Plan</h2>
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.key}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-6",
                  card.key === currentPlan ? "border-primary" : "border-border"
                )}
              >
                <h3 className="text-lg font-semibold text-foreground">{card.label}</h3>
                <div className="mb-1 text-2xl font-bold text-foreground">{card.price}</div>
                <p className="mb-4 text-xs text-muted-foreground">{nf.format(card.credits)} credits per month</p>
                <ul className="mb-6 flex-1 space-y-1.5 text-sm text-muted-foreground">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {planButton(card.key)}
              </div>
            ))}
          </div>

          {/* Credit packs */}
          <h2 className="mb-1 text-base font-semibold text-foreground">Buy more credits</h2>
          <p className="mb-3 text-sm text-muted-foreground">One-time purchase. Added to your balance right away.</p>
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => {
              const key = `pack:${pack.id}`;
              return (
                <div key={pack.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
                  <div className="text-xl font-semibold tabular-nums text-foreground">{nf.format(pack.credits)}</div>
                  <div className="mb-4 text-sm text-muted-foreground">credits for {pack.displayPrice}</div>
                  <Button
                    variant="secondary"
                    className="mt-auto"
                    disabled={!!actionLoading}
                    onClick={() => call(key, "/api/billing/buy-credits", { packId: pack.id })}
                  >
                    {actionLoading === key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Buy {pack.displayPrice}
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={actionLoading === "portal"}
            onClick={() => call("portal", "/api/billing/portal")}
          >
            {actionLoading === "portal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Payment methods and invoices
          </Button>
        </>
      )}
    </main>
  );
}

export default function BillingPage() {
  return (
    <React.Suspense fallback={null}>
      <BillingContent />
    </React.Suspense>
  );
}

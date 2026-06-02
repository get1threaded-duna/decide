import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type Plan } from "@/lib/stripe/plans";
import { SubscribeButton } from "./SubscribeButton";

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: { canceled?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/pricing");

  const { data: appUser } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const currentPlan = (appUser?.plan ?? "free") as Plan;

  return (
    <main className="min-h-screen bg-background px-5 pb-16 pt-7">
      <div className="mx-auto max-w-[820px] space-y-8">
        <header className="flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--decide-accent)]" />
            <span className="font-serif text-xl font-medium text-foreground">Decide</span>
          </a>
          <a
            href="/dashboard"
            className="text-xs text-[var(--decide-text-muted)] hover:text-foreground transition-colors"
          >
            ← Back to dashboard
          </a>
        </header>

        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Decide more, deliberate less.
          </h1>
          <p className="mt-2 text-sm text-[var(--decide-text-secondary)]">
            Free keeps the daily 6-card feed working. Pro is for when you want Decide to actually learn you.
          </p>
        </div>

        {searchParams?.canceled && (
          <div className="rounded-xl border border-[var(--decide-border)] bg-[var(--decide-surface-subtle)] px-4 py-3 text-sm text-[var(--decide-text-secondary)]">
            Checkout canceled. No charge — you can subscribe anytime.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <PlanCard plan={PLANS.free} currentPlan={currentPlan} />
          <PlanCard plan={PLANS.pro} currentPlan={currentPlan} accent />
        </div>

        <p className="text-xs text-[var(--decide-text-muted)] text-center">
          Test mode. Use Stripe test card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.
        </p>
      </div>
    </main>
  );
}

function PlanCard({
  plan,
  currentPlan,
  accent = false,
}: {
  plan: typeof PLANS[Plan];
  currentPlan: Plan;
  accent?: boolean;
}) {
  const isCurrent = currentPlan === plan.id;
  const showUpgrade = plan.id === "pro" && currentPlan === "free";

  return (
    <article
      className={cn(
        "rounded-xl border p-6 space-y-4",
        accent
          ? "border-[var(--decide-accent)] bg-card shadow-sm"
          : "border-[var(--decide-border)] bg-card"
      )}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">
          {plan.label}
        </h2>
        <span
          className={cn(
            "font-serif text-2xl font-medium",
            accent ? "text-[var(--decide-accent)]" : "text-foreground"
          )}
        >
          {plan.priceLabel}
        </span>
      </div>

      <ul className="space-y-2 text-sm text-[var(--decide-text-tertiary)]">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2">
            <Check size={14} className="mt-1 shrink-0 text-[var(--decide-accent-dark)]" />
            <span>{f}</span>
          </li>
        ))}
        {plan.notFeatures?.map(f => (
          <li key={f} className="flex items-start gap-2 text-[var(--decide-text-muted)]">
            <X size={14} className="mt-1 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent && (
        <p className="rounded-lg bg-[var(--decide-surface-subtle)] px-3 py-2 text-xs text-[var(--decide-text-tertiary)]">
          Your current plan.
        </p>
      )}

      {showUpgrade && <SubscribeButton />}
    </article>
  );
}

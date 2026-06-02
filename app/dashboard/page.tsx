import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contexts, DEFAULT_CONTEXT_ID } from "@/lib/decide/contexts";
import { pick, MODALITIES, type FeedbackMap } from "@/lib/decide/scoring";
import { derivePatterns } from "@/lib/decide/patterns";
import type { FeedbackEntry, Modality } from "@/lib/decide/types";
import { ContextBar } from "@/components/decide/ContextBar";
import { ContextSwitcher } from "@/components/decide/ContextSwitcher";
import { NoticingBanner } from "@/components/decide/NoticingBanner";
import { FeedCardLive } from "./FeedCardLive";

// Defaults until the Tune panel ships in a later week
const DEFAULT_INTERESTS = new Set([
  "comfort","business","food","real-estate","music","outdoor",
  "ai","homesteading","hiphop","family","brotherhood",
]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { ctx?: string; upgraded?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const activeCtxId = searchParams?.ctx && contexts[searchParams.ctx]
    ? searchParams.ctx
    : DEFAULT_CONTEXT_ID;
  const ctx = contexts[activeCtxId];

  const [{ data: savedRows }, { data: logRows }, { data: appUser }, { data: profile }] = await Promise.all([
    supabase.from("saved_items").select("item_id").eq("user_id", user.id),
    supabase
      .from("feedback_log")
      .select("action, item_id, item_snapshot, ts")
      .eq("user_id", user.id)
      .order("ts", { ascending: true }),
    supabase.from("users").select("plan").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
  ]);

  const plan = (appUser?.plan ?? "free") as "free" | "pro";
  const justUpgraded = searchParams?.upgraded === "1";

  const storedInterests = Array.isArray(profile?.interests) ? profile.interests as string[] : [];
  const interestSet =
    storedInterests.length > 0 ? new Set(storedInterests) : DEFAULT_INTERESTS;

  const savedIds = new Set((savedRows ?? []).map(r => r.item_id as string));

  const feedback: FeedbackMap = {};
  for (const row of logRows ?? []) {
    feedback[row.item_id as string] = row.action as FeedbackMap[string];
  }
  savedIds.forEach(id => { feedback[id] = "save"; });

  const log: FeedbackEntry[] = (logRows ?? [])
    .filter(r => r.item_snapshot)
    .map(r => ({
      action: r.action as FeedbackEntry["action"],
      item: r.item_snapshot as FeedbackEntry["item"],
      ts: new Date(r.ts as string).getTime(),
    }));
  const patterns = derivePatterns(log);

  const picks: Record<Modality, ReturnType<typeof pick>> = {
    eat:     pick("eat",     ctx, 0, interestSet, feedback),
    watch:   pick("watch",   ctx, 0, interestSet, feedback),
    listen:  pick("listen",  ctx, 0, interestSet, feedback),
    read:    pick("read",    ctx, 0, interestSet, feedback),
    do:      pick("do",      ctx, 0, interestSet, feedback),
    connect: pick("connect", ctx, 0, interestSet, feedback),
  };

  const presets = Object.values(contexts).map(c => ({
    id: c.id,
    label: c.label,
    href: `/dashboard?ctx=${c.id}`,
  }));
  const interestsArr = Array.from(interestSet).sort();
  const reasonKey = (id: string) =>
    `${id}::${ctx.id}::${interestsArr.join(",")}::s${patterns.saveCount}`;

  return (
    <main className="min-h-screen bg-background px-5 pb-16 pt-7">
      <div className="mx-auto max-w-[720px] space-y-6">

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--decide-accent)]" />
            <span className="font-serif text-xl font-medium text-foreground">Decide</span>
          </div>
          <nav className="flex items-center gap-3">
            {plan === "pro" ? (
              <a
                href="/tune"
                className="text-xs text-[var(--decide-text-tertiary)] hover:text-foreground transition-colors"
              >
                Tune me
              </a>
            ) : (
              <a
                href="/pricing"
                className="rounded-full border border-[var(--decide-accent)] px-2.5 py-1 text-xs text-[var(--decide-accent)] hover:bg-[var(--decide-accent)] hover:text-background transition-colors"
              >
                Upgrade to Pro
              </a>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-[var(--decide-text-muted)] hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </nav>
        </header>

        {justUpgraded && (
          <div className="rounded-xl border border-[#A7E3C5] bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46]">
            Welcome to Decide Pro. The Tune-me panel is now in the top right.
          </div>
        )}

        <ContextBar
          location={ctx.loc}
          time={ctx.time}
          weather={ctx.weather}
          season={ctx.season}
          weatherIcon={ctx.weatherIcon}
        />

        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            {ctx.greetT}
          </h1>
          <p className="mt-1 text-sm text-[var(--decide-text-secondary)]">{ctx.greetS}</p>
        </div>

        {patterns.topTags.length > 0 && <NoticingBanner tags={patterns.topTags} />}

        <div className="flex flex-col gap-3">
          {MODALITIES.map(cat => {
            const item = picks[cat];
            return (
              <FeedCardLive
                key={cat}
                modality={cat}
                itemId={item.id}
                title={item.title}
                meta={item.meta}
                fallbackReason={item.fallback}
                contextId={ctx.id}
                interests={interestsArr}
                reasonKey={reasonKey(item.id)}
                isSaved={savedIds.has(item.id)}
              />
            );
          })}
        </div>

        <ContextSwitcher presets={presets} activeId={ctx.id} />
      </div>
    </main>
  );
}

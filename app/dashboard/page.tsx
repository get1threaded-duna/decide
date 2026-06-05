import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contexts, DEFAULT_CONTEXT_ID } from "@/lib/decide/contexts";
import { pickMany, MODALITIES, type FeedbackMap } from "@/lib/decide/scoring";
import { derivePatterns } from "@/lib/decide/patterns";
import type { FeedbackEntry, Modality } from "@/lib/decide/types";
import { ContextBar } from "@/components/decide/ContextBar";
import { LiveContextBar } from "@/components/decide/LiveContextBar";
import { ContextSwitcher } from "@/components/decide/ContextSwitcher";
import { AvatarMenu } from "@/components/decide/AvatarMenu";
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

  const toCandidate = (it: ReturnType<typeof pickMany>[number]) => ({
    id: it.id,
    title: it.title,
    meta: it.meta,
    fallback: it.fallback,
  });
  const candidates: Record<Modality, ReturnType<typeof toCandidate>[]> = {
    eat:     pickMany("eat",     ctx, 5, interestSet, feedback).map(toCandidate),
    watch:   pickMany("watch",   ctx, 5, interestSet, feedback).map(toCandidate),
    listen:  pickMany("listen",  ctx, 5, interestSet, feedback).map(toCandidate),
    read:    pickMany("read",    ctx, 5, interestSet, feedback).map(toCandidate),
    do:      pickMany("do",      ctx, 5, interestSet, feedback).map(toCandidate),
    connect: pickMany("connect", ctx, 5, interestSet, feedback).map(toCandidate),
  };

  const presets = Object.values(contexts).map(c => ({
    id: c.id,
    label: c.label,
    href: `/dashboard?ctx=${c.id}`,
  }));
  const interestsArr = Array.from(interestSet).sort();
  const reasonKeyBase = `${ctx.id}::${interestsArr.join(",")}::s${patterns.saveCount}`;
  const savedIdArr = Array.from(savedIds);

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
              <AvatarMenu email={user.email ?? ""} />
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

        {activeCtxId === "home" ? (
          <LiveContextBar
            fallback={{ loc: ctx.loc, weather: ctx.weather, weatherIcon: ctx.weatherIcon }}
          />
        ) : (
          <ContextBar
            location={ctx.loc}
            time={ctx.time}
            weather={ctx.weather}
            season={ctx.season}
            weatherIcon={ctx.weatherIcon}
          />
        )}

        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            {ctx.greetT}
          </h1>
          <p className="mt-1 text-sm text-[var(--decide-text-secondary)]">{ctx.greetS}</p>
        </div>

        {patterns.topTags.length > 0 && <NoticingBanner tags={patterns.topTags} />}

        <div className="flex flex-col gap-3">
          {MODALITIES.map(cat => (
            <FeedCardLive
              key={cat}
              modality={cat}
              candidates={candidates[cat]}
              contextId={ctx.id}
              interests={interestsArr}
              savedIds={savedIdArr}
              reasonKeyBase={reasonKeyBase}
            />
          ))}
        </div>

        <ContextSwitcher presets={presets} activeId={ctx.id} />
      </div>
    </main>
  );
}

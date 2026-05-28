import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allInterests } from "@/lib/decide/catalog";
import { derivePatterns } from "@/lib/decide/patterns";
import type { FeedbackEntry } from "@/lib/decide/types";
import { InterestEditor } from "./InterestEditor";

export default async function TunePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/tune");

  const [{ data: appUser }, { data: profile }, { data: logRows }] = await Promise.all([
    supabase.from("users").select("plan").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("feedback_log")
      .select("action, item_snapshot, ts")
      .eq("user_id", user.id)
      .order("ts", { ascending: true }),
  ]);

  if ((appUser?.plan ?? "free") !== "pro") redirect("/pricing");

  const storedInterests = Array.isArray(profile?.interests) ? profile.interests as string[] : [];

  const log: FeedbackEntry[] = (logRows ?? [])
    .filter(r => r.item_snapshot)
    .map(r => ({
      action: r.action as FeedbackEntry["action"],
      item: r.item_snapshot as FeedbackEntry["item"],
      ts: new Date(r.ts as string).getTime(),
    }));
  const patterns = derivePatterns(log);

  return (
    <main className="min-h-screen bg-background px-5 pb-16 pt-7">
      <div className="mx-auto max-w-[720px] space-y-7">
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
            Tune me
          </h1>
          <p className="mt-1 text-sm text-[var(--decide-text-secondary)]">
            What Decide has noticed, and what you can nudge.
          </p>
        </div>

        <section className="space-y-3">
          <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)]">
            Patterns
          </p>
          {patterns.topTags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {patterns.topTags.map(t => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D9A8] bg-card px-2.5 py-1 text-xs text-[var(--decide-accent-dark)]"
                >
                  {t.tag} <span className="font-mono text-[10px] text-[var(--decide-accent)]">{t.count}x</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-[var(--decide-text-muted)]">
              Save 2+ items with a shared tag to see a pattern appear here.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)]">
            Recent saves
          </p>
          {patterns.recentSaves.length ? (
            <ul className="space-y-1 text-sm text-[var(--decide-text-tertiary)]">
              {patterns.recentSaves.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--decide-text-muted)] w-14 pt-0.5">
                    {s.item.category}
                  </span>
                  <span>{s.item.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-[var(--decide-text-muted)]">
              No saves yet — tap Save on a card to teach Decide what you like.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)]">
            Stated interests
          </p>
          <p className="text-xs text-[var(--decide-text-muted)]">
            Tap to toggle. Saves automatically.
          </p>
          <InterestEditor allInterests={[...allInterests]} initial={storedInterests} />
        </section>
      </div>
    </main>
  );
}

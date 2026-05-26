import { FeedCard } from "@/components/decide/FeedCard";
import { ContextBar } from "@/components/decide/ContextBar";
import { NoticingBanner } from "@/components/decide/NoticingBanner";
import { ContextSwitcher } from "@/components/decide/ContextSwitcher";
import { ConfidenceBar } from "@/components/decide/ConfidenceBar";

const MOCK_PRESETS = [
  { id: "home",     label: "Home · Fairfax · Sun PM" },
  { id: "la",       label: "7pm in LA, October" },
  { id: "tokyo",    label: "Tokyo morning, winter" },
  { id: "rainy",    label: "Rainy Tuesday night home" },
  { id: "saturday", label: "Saturday morning, sunny" },
];

const MOCK_TAGS = [
  { tag: "hiphop", count: 3 },
  { tag: "comfort", count: 2 },
];

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-background px-5 pb-16 pt-7">
      <div className="mx-auto max-w-[720px] space-y-10">

        {/* Page header */}
        <div>
          <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)] mb-1">
            Component preview · Week 1
          </p>
          <h1 className="font-serif text-3xl font-medium tracking-tightest text-foreground">
            Decide
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--decide-accent)]" />
          </h1>
        </div>

        {/* ── ContextBar ──────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>ContextBar</SectionLabel>
          <ContextBar
            location="Fairfax, VA"
            time="Sun · 5:32 PM"
            weather="72°, clear"
            season="Late spring"
            weatherIcon="sun"
          />
          <ContextBar
            location="Shibuya, Tokyo"
            time="Sat · 8:12 AM"
            weather="46°, crisp"
            season="February"
            weatherIcon="cloud"
          />
          <ContextBar
            location="Fairfax, VA"
            time="Tue · 9:18 PM"
            weather="58°, rain"
            season="November"
            weatherIcon="rain"
          />
        </section>

        {/* ── NoticingBanner ──────────────────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>NoticingBanner</SectionLabel>
          <NoticingBanner tags={[{ tag: "hiphop", count: 3 }]} />
          <NoticingBanner tags={MOCK_TAGS} />
        </section>

        {/* ── FeedCard — all 6 modalities ─────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>FeedCard · all 6 modalities</SectionLabel>
          <FeedCard
            modality="eat"
            title="Korean fried chicken from Bonchon"
            meta="$24 · 22 min delivery · Annandale"
            reason="Sunday lazy mode, low-effort comfort food at home."
            isSaved
          />
          <FeedCard
            modality="watch"
            title="Slow Horses — Season 4"
            meta="50 min · thriller · Apple TV+"
            reason="Tight pacing, no homework, perfect for one and done."
          />
          <FeedCard
            modality="listen"
            title="Madlib · Sound Ancestors"
            meta="Album · 41 min · instrumental hip-hop"
            reason="Headphones, no lyrics, full attention. The producer's producer."
          />
          <FeedCard
            modality="read"
            title="Notes on becoming a director of AI agents"
            meta="9 min · Substack"
            reason="This is literally how you described your own role."
          />
          <FeedCard
            modality="do"
            title="Sunset walk · Old Town Alexandria waterfront"
            meta="60 min · 18 min drive · free"
            reason="Golden hour, water views, ice cream on the way back."
          />
          <FeedCard
            modality="connect"
            title="Text someone who comes to mind right now"
            meta="2 min · low effort · high return"
            reason="Two minutes of intention beats five group dinners. Don't overthink the message."
            isDown
          />
        </section>

        {/* ── ConfidenceBar ───────────────────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>ConfidenceBar</SectionLabel>
          <div className="rounded-xl border border-[var(--decide-border)] bg-[var(--decide-surface-subtle)] space-y-2.5 px-5 py-4">
            {(["eat", "watch", "listen", "read", "do", "connect"] as const).map((cat, i) => (
              <ConfidenceBar key={cat} label={cat} value={[35, 28, 60, 22, 48, 18][i]} />
            ))}
          </div>
        </section>

        {/* ── ContextSwitcher ─────────────────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>ContextSwitcher</SectionLabel>
          <div className="rounded-xl border border-[var(--decide-border)] bg-card px-5 py-4">
            <ContextSwitcher presets={MOCK_PRESETS} activeId="home" />
          </div>
        </section>

      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-widest text-[var(--decide-text-muted)]">
      {children}
    </p>
  );
}
// preview verified

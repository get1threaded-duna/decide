"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bookmark, RefreshCw, Sparkles, ChefHat, Tv, BookOpen, Footprints, Headphones, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Modality } from "@/lib/decide/types";
import type { UserContext } from "@/lib/recommender/prompt";
import { logSwap, toggleSave } from "./actions";

const MODALITY_META: Record<Modality, { label: string; Icon: React.ElementType; colorVar: string; bgVar: string }> = {
  eat:     { label: "Eat",     Icon: ChefHat,        colorVar: "var(--cat-eat-color)",     bgVar: "var(--cat-eat-bg)"     },
  watch:   { label: "Watch",   Icon: Tv,             colorVar: "var(--cat-watch-color)",   bgVar: "var(--cat-watch-bg)"   },
  read:    { label: "Read",    Icon: BookOpen,       colorVar: "var(--cat-read-color)",    bgVar: "var(--cat-read-bg)"    },
  do:      { label: "Do",      Icon: Footprints,     colorVar: "var(--cat-do-color)",      bgVar: "var(--cat-do-bg)"      },
  listen:  { label: "Listen",  Icon: Headphones,     colorVar: "var(--cat-listen-color)",  bgVar: "var(--cat-listen-bg)"  },
  connect: { label: "Connect", Icon: HeartHandshake, colorVar: "var(--cat-connect-color)", bgVar: "var(--cat-connect-bg)" },
};

export interface CandidateItem {
  id: string;
  title: string;
  meta: string;
  fallback: string;
}

interface FeedCardLiveProps {
  modality: Modality;
  candidates: CandidateItem[];
  contextId: string;
  interests: string[];
  savedIds: string[];
  reasonKeyBase: string;
  /** Reason text pre-resolved server-side for the FIRST card; skips the streaming fetch on first paint. */
  initialReason?: string;
  /** Live user context — required for swap pool refresh via /api/picks. */
  userContext?: UserContext;
}

export function FeedCardLive({
  modality,
  candidates,
  contextId,
  interests,
  savedIds,
  reasonKeyBase,
  initialReason,
  userContext,
}: FeedCardLiveProps) {
  const m = MODALITY_META[modality];
  const isConnect = modality === "connect";

  const [pool, setPool] = useState<CandidateItem[]>(candidates);
  const [idx, setIdx] = useState(0);
  const [reasonCache, setReasonCache] = useState<Record<string, string>>(() =>
    initialReason && candidates[0] ? { [candidates[0].id]: initialReason } : {},
  );
  const [reason, setReason] = useState(initialReason ?? "");
  const [streaming, setStreaming] = useState(!initialReason);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [, startTransition] = useTransition();

  const current = pool[idx] ?? pool[0] ?? null;
  const reasonKey = current ? `${current.id}::${reasonKeyBase}` : "";

  const activeKeyRef = useRef(reasonKey);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // Track in-session saves so the Save chip updates immediately after a click
  // (savedIds prop only refreshes after revalidatePath returns).
  const [sessionSaved, setSessionSaved] = useState<Set<string>>(new Set());
  const isSaved = current ? savedSet.has(current.id) || sessionSaved.has(current.id) : false;

  useEffect(() => {
    if (!current) return;
    // Server-batched reasons (initial item or pool-refresh result) are pre-resolved.
    // Paint them immediately and skip streaming.
    const cached = reasonCache[current.id];
    if (cached) {
      activeKeyRef.current = reasonKey;
      setReason(cached);
      setStreaming(false);
      return;
    }
    activeKeyRef.current = reasonKey;
    setReason("");
    setStreaming(true);

    const controller = new AbortController();
    const localKey = reasonKey;

    (async () => {
      try {
        const res = await fetch("/api/reason", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: current.id, category: modality, contextId, interests }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`reason fetch failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (activeKeyRef.current === localKey) setReason(acc);
        }
        if (activeKeyRef.current === localKey) setStreaming(false);
      } catch {
        if (controller.signal.aborted) return;
        if (activeKeyRef.current === localKey) {
          setReason(current.fallback);
          setStreaming(false);
        }
      }
    })();

    return () => controller.abort();
  }, [reasonKey, current, modality, contextId, interests, reasonCache]);

  const handleSave = () => {
    if (!current) return;
    const id = current.id;
    setSessionSaved((s) => {
      const next = new Set(s);
      if (savedSet.has(id) || next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(async () => {
      await toggleSave(id, modality);
    });
  };

  const handleSwap = async () => {
    if (!current || isFetchingMore) return;
    const swappedId = current.id;

    // Fire-and-forget feedback log; UI shouldn't wait.
    void logSwap(swappedId, modality);

    const nextIdx = idx + 1;
    if (nextIdx < pool.length) {
      setIdx(nextIdx);
      return;
    }

    // Pool exhausted — mint a fresh batch from /api/picks.
    // Requires userContext; without it, just cycle.
    if (!userContext) {
      setIdx(0);
      return;
    }

    setIsFetchingMore(true);
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: modality,
          seenIds: pool.map((c) => c.id),
          context: userContext,
          poolSize: 5,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          candidates: CandidateItem[];
          reasons: Record<string, string>;
        };
        if (data.candidates.length > 0) {
          setPool((p) => [...p, ...data.candidates]);
          setReasonCache((c) => ({ ...c, ...data.reasons }));
          setIdx(nextIdx);
          return;
        }
      }
      // Nothing usable came back — cycle to the top of the existing pool.
      setIdx(0);
    } finally {
      setIsFetchingMore(false);
    }
  };

  if (!current) return null;

  return (
    <article
      className={cn(
        "rounded-xl border px-[18px] py-4 transition-colors",
        isConnect
          ? "border-[#F0D9C9] bg-gradient-to-b from-[#FFFBF7] to-white"
          : "border-[var(--decide-border)] bg-card"
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: m.bgVar, color: m.colorVar }}
        >
          <m.Icon size={15} />
        </span>
        <span className="text-2xs font-medium uppercase tracking-wider text-[var(--decide-text-muted)]">
          {m.label}
        </span>
      </div>

      <div
        key={current.id}
        className="animate-[card-swap-in_240ms_ease-out]"
      >
        <h2 className="font-serif text-xl font-medium tracking-tight text-foreground mb-1">
          {current.title}
        </h2>
        <p className="text-sm text-[var(--decide-text-secondary)] mb-2.5">{current.meta}</p>

        <div
          className={cn(
            "relative mb-3 min-h-6 rounded-r-lg py-2.5 pl-9 pr-3 text-sm leading-relaxed text-[#3D362C]",
            "border-l-2 border-[var(--decide-accent)] bg-[var(--decide-surface-subtle)]",
            isConnect && "border-[var(--cat-connect-color)] bg-[#FFF6EE]"
          )}
        >
          <Sparkles
            size={14}
            className="absolute left-3 top-3"
            style={{ color: isConnect ? "var(--cat-connect-color)" : "var(--decide-accent)" }}
          />
          {reason || <SkeletonReason />}
          {streaming && reason && <Cursor />}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={handleSave}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            isSaved
              ? "bg-[#ECFDF5] text-[#065F46] border-[#A7E3C5]"
              : "border-[var(--decide-border-warm)] text-[var(--decide-text-tertiary)] hover:bg-[var(--decide-surface-subtle)] hover:border-[#C2B8A5]"
          )}
        >
          <Bookmark size={13} /> {isSaved ? "Saved" : "Save"}
        </button>
        <button
          onClick={handleSwap}
          disabled={isFetchingMore}
          aria-label="Swap to a different recommendation"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            "border-[var(--decide-border-warm)] text-[var(--decide-text-tertiary)] hover:bg-[var(--decide-surface-subtle)] hover:border-[#C2B8A5]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCw size={13} className={cn(isFetchingMore && "animate-spin")} /> Swap
        </button>
      </div>
    </article>
  );
}

function SkeletonReason() {
  return (
    <>
      <Shimmer width="60%" />
      <span className="mx-1" />
      <Shimmer width="30%" />
      <span className="mx-1" />
      <Shimmer width="45%" />
    </>
  );
}

function Shimmer({ width }: { width: string }) {
  return (
    <span
      className="inline-block h-3 align-middle rounded-sm bg-gradient-to-r from-[#ECE5D7] via-[#F5EFE3] to-[#ECE5D7] bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
      style={{ width }}
    />
  );
}

function Cursor() {
  return (
    <span className="inline-block w-[2px] h-[14px] -mb-[2px] ml-[2px] bg-[var(--decide-accent)] animate-[blink_0.9s_steps(2,end)_infinite]" />
  );
}

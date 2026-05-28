"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, Sparkles, ChefHat, Tv, BookOpen, Footprints, Headphones, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Modality } from "@/lib/decide/types";
import { toggleSave } from "./actions";

const MODALITY_META: Record<Modality, { label: string; Icon: React.ElementType; colorVar: string; bgVar: string }> = {
  eat:     { label: "Eat",     Icon: ChefHat,        colorVar: "var(--cat-eat-color)",     bgVar: "var(--cat-eat-bg)"     },
  watch:   { label: "Watch",   Icon: Tv,             colorVar: "var(--cat-watch-color)",   bgVar: "var(--cat-watch-bg)"   },
  read:    { label: "Read",    Icon: BookOpen,       colorVar: "var(--cat-read-color)",    bgVar: "var(--cat-read-bg)"    },
  do:      { label: "Do",      Icon: Footprints,     colorVar: "var(--cat-do-color)",      bgVar: "var(--cat-do-bg)"      },
  listen:  { label: "Listen",  Icon: Headphones,     colorVar: "var(--cat-listen-color)",  bgVar: "var(--cat-listen-bg)"  },
  connect: { label: "Connect", Icon: HeartHandshake, colorVar: "var(--cat-connect-color)", bgVar: "var(--cat-connect-bg)" },
};

interface FeedCardLiveProps {
  modality: Modality;
  itemId: string;
  title: string;
  meta: string;
  fallbackReason: string;
  contextId: string;
  interests: string[];
  reasonKey: string;
  isSaved: boolean;
}

export function FeedCardLive({
  modality,
  itemId,
  title,
  meta,
  fallbackReason,
  contextId,
  interests,
  reasonKey,
  isSaved,
}: FeedCardLiveProps) {
  const m = MODALITY_META[modality];
  const isConnect = modality === "connect";

  const [reason, setReason] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [, startTransition] = useTransition();
  // Track latest reasonKey to ignore stale stream chunks if the key changes mid-flight
  const activeKeyRef = useRef(reasonKey);

  useEffect(() => {
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
          body: JSON.stringify({ itemId, category: modality, contextId, interests }),
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
          setReason(fallbackReason);
          setStreaming(false);
        }
      }
    })();

    return () => controller.abort();
  }, [reasonKey, itemId, modality, contextId, interests, fallbackReason]);

  const handleSave = () => {
    startTransition(async () => {
      await toggleSave(itemId, modality);
    });
  };

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

      <h2 className="font-serif text-xl font-medium tracking-tight text-foreground mb-1">
        {title}
      </h2>
      <p className="text-sm text-[var(--decide-text-secondary)] mb-2.5">{meta}</p>

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

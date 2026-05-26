import { Bookmark, RefreshCw, ThumbsDown, Info, Sparkles, ChefHat, Tv, BookOpen, Footprints, Headphones, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export type Modality = "eat" | "watch" | "read" | "do" | "listen" | "connect";

const MODALITY_META: Record<Modality, { label: string; Icon: React.ElementType; colorVar: string; bgVar: string }> = {
  eat:     { label: "Eat",     Icon: ChefHat,        colorVar: "var(--cat-eat-color)",     bgVar: "var(--cat-eat-bg)"     },
  watch:   { label: "Watch",   Icon: Tv,             colorVar: "var(--cat-watch-color)",   bgVar: "var(--cat-watch-bg)"   },
  read:    { label: "Read",    Icon: BookOpen,       colorVar: "var(--cat-read-color)",    bgVar: "var(--cat-read-bg)"    },
  do:      { label: "Do",      Icon: Footprints,     colorVar: "var(--cat-do-color)",      bgVar: "var(--cat-do-bg)"      },
  listen:  { label: "Listen",  Icon: Headphones,     colorVar: "var(--cat-listen-color)",  bgVar: "var(--cat-listen-bg)"  },
  connect: { label: "Connect", Icon: HeartHandshake, colorVar: "var(--cat-connect-color)", bgVar: "var(--cat-connect-bg)" },
};

export interface FeedCardProps {
  modality: Modality;
  title: string;
  meta: string;
  reason: string;
  isSaved?: boolean;
  isDown?: boolean;
}

export function FeedCard({ modality, title, meta, reason, isSaved = false, isDown = false }: FeedCardProps) {
  const m = MODALITY_META[modality];
  const isConnect = modality === "connect";

  return (
    <article
      className={cn(
        "rounded-xl border px-[18px] py-4 transition-colors",
        isConnect
          ? "border-[#F0D9C9] bg-gradient-to-b from-[#FFFBF7] to-white"
          : "border-[var(--decide-border)] bg-card"
      )}
    >
      {/* Header */}
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

      {/* Title + meta */}
      <h2 className="font-serif text-xl font-medium tracking-tight text-foreground mb-1">
        {title}
      </h2>
      <p className="text-sm text-[var(--decide-text-secondary)] mb-2.5">{meta}</p>

      {/* Reason block */}
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
        {reason}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        <ActionButton active={isSaved} activeClass="bg-[#ECFDF5] text-[#065F46] border-[#A7E3C5]">
          <Bookmark size={13} /> {isSaved ? "Saved" : "Save"}
        </ActionButton>
        <ActionButton>
          <RefreshCw size={13} /> Swap
        </ActionButton>
        <ActionButton active={isDown} activeClass="bg-[#FEF2F2] text-[#991B1B] border-[#F5C2C2]">
          <ThumbsDown size={13} /> Not now
        </ActionButton>
        <ActionButton>
          <Info size={13} /> Match
        </ActionButton>
      </div>
    </article>
  );
}

function ActionButton({
  children,
  active = false,
  activeClass = "",
}: {
  children: React.ReactNode;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-[var(--decide-border-warm)]",
        "px-2.5 py-1.5 text-xs text-[var(--decide-text-tertiary)]",
        "transition-colors hover:bg-[var(--decide-surface-subtle)] hover:border-[#C2B8A5]",
        active && activeClass
      )}
    >
      {children}
    </button>
  );
}

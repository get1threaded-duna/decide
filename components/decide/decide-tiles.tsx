"use client";

import {
  ChefHat,
  Tv,
  BookOpen,
  Footprints,
  Headphones,
  HeartHandshake,
  Flame,
  Sparkles,
} from "lucide-react";

import type { Modality } from "@/lib/decide/types";
import { cn } from "@/lib/utils";

export type TileKind = "hero" | "streak" | "category";

export interface HeroTile {
  id: "hero";
  kind: "hero";
  title: string;
  subtitle: string;
  span: TileSpan;
}

export interface StreakTile {
  id: "streak";
  kind: "streak";
  title: string;
  value: number;
  best: number;
  span: TileSpan;
}

export interface CategoryTile {
  id: `category:${Modality}`;
  kind: "category";
  categoryId: Modality;
  label: string;
  blurb: string;
  span: TileSpan;
  onSelect?: (modality: Modality) => void;
}

export type Tile = HeroTile | StreakTile | CategoryTile;

export interface TileSpan {
  col: number;
  row: number;
}

const CATEGORY_META: Record<
  Modality,
  { label: string; blurb: string; Icon: React.ElementType; colorVar: string; bgVar: string }
> = {
  eat: {
    label: "Eat",
    blurb: "Pick a meal, restaurant, or recipe.",
    Icon: ChefHat,
    colorVar: "var(--cat-eat-color)",
    bgVar: "var(--cat-eat-bg)",
  },
  watch: {
    label: "Watch",
    blurb: "A film, show, or something in your queue.",
    Icon: Tv,
    colorVar: "var(--cat-watch-color)",
    bgVar: "var(--cat-watch-bg)",
  },
  listen: {
    label: "Listen",
    blurb: "Music, a podcast, or a new album.",
    Icon: Headphones,
    colorVar: "var(--cat-listen-color)",
    bgVar: "var(--cat-listen-bg)",
  },
  read: {
    label: "Read",
    blurb: "Articles, essays, or that book you saved.",
    Icon: BookOpen,
    colorVar: "var(--cat-read-color)",
    bgVar: "var(--cat-read-bg)",
  },
  do: {
    label: "Do",
    blurb: "An activity, errand, or project step.",
    Icon: Footprints,
    colorVar: "var(--cat-do-color)",
    bgVar: "var(--cat-do-bg)",
  },
  connect: {
    label: "Connect",
    blurb: "Reach out to someone you care about.",
    Icon: HeartHandshake,
    colorVar: "var(--cat-connect-color)",
    bgVar: "var(--cat-connect-bg)",
  },
};

const CATEGORY_ORDER: Modality[] = ["eat", "watch", "listen", "read", "do", "connect"];

const DEFAULT_SPANS: Record<TileKind, TileSpan> = {
  hero: { col: 4, row: 2 },
  streak: { col: 2, row: 1 },
  category: { col: 2, row: 1 },
};

export interface CreateDecideTilesArgs {
  user?: { email?: string | null; user_metadata?: { full_name?: string | null } | null } | null;
  streak?: { current: number; best: number } | null;
  onPickCategory?: (modality: Modality) => void;
}

export function createDecideTiles({
  user,
  streak,
  onPickCategory,
}: CreateDecideTilesArgs = {}): Tile[] {
  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "friend";

  const hero: HeroTile = {
    id: "hero",
    kind: "hero",
    title: `Hey ${displayName} — what should we decide?`,
    subtitle: "Tap a category, or open the full feed.",
    span: DEFAULT_SPANS.hero,
  };

  const streakTile: StreakTile = {
    id: "streak",
    kind: "streak",
    title: "Decision streak",
    value: streak?.current ?? 0,
    best: streak?.best ?? 0,
    span: DEFAULT_SPANS.streak,
  };

  const categoryTiles: CategoryTile[] = CATEGORY_ORDER.map((modality) => {
    const meta = CATEGORY_META[modality];
    return {
      id: `category:${modality}` as const,
      kind: "category",
      categoryId: modality,
      label: meta.label,
      blurb: meta.blurb,
      span: DEFAULT_SPANS.category,
      onSelect: onPickCategory,
    };
  });

  return [hero, streakTile, ...categoryTiles];
}

export const DEFAULT_LAYOUT: string[] = [
  "hero",
  "streak",
  "category:eat",
  "category:watch",
  "category:listen",
  "category:read",
  "category:do",
  "category:connect",
];

export function TileBody({ tile }: { tile: Tile }) {
  if (tile.kind === "hero") {
    return (
      <div className="flex h-full flex-col justify-between">
        <Sparkles size={20} className="text-[var(--decide-accent)]" />
        <div>
          <h2 className="mb-1 font-serif text-2xl font-medium tracking-tight text-foreground">
            {tile.title}
          </h2>
          <p className="text-sm text-[var(--decide-text-secondary)]">{tile.subtitle}</p>
        </div>
      </div>
    );
  }

  if (tile.kind === "streak") {
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-[var(--decide-text-muted)]">
          <Flame size={14} className="text-[var(--decide-accent)]" />
          {tile.title}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-semibold tracking-tight">
            {tile.value}
          </span>
          <span className="text-xs text-[var(--decide-text-tertiary)]">
            best {tile.best}
          </span>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[tile.categoryId];
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      onClick={() => tile.onSelect?.(tile.categoryId)}
      className={cn(
        "flex h-full w-full flex-col justify-between gap-3 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--decide-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "rounded-md"
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: meta.bgVar, color: meta.colorVar }}
      >
        <Icon size={15} />
      </span>
      <div>
        <div
          className="text-2xs font-medium uppercase tracking-wider"
          style={{ color: meta.colorVar }}
        >
          {meta.label}
        </div>
        <p className="mt-0.5 text-sm text-[var(--decide-text-secondary)]">{tile.blurb}</p>
      </div>
    </button>
  );
}

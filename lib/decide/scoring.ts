import { catalog } from "./catalog";
import type { DecideContext, Item, Modality } from "./types";

export type FeedbackMap = Record<string, "save" | "swap" | "ignore" | "open" | undefined>;

export function score(
  item: Item,
  ctx: DecideContext,
  interests: ReadonlySet<string>,
  feedback: FeedbackMap,
): number {
  let s = 0;
  const t = item.tags;
  if (t.includes(ctx.tod)) s += 3;
  if (t.includes(ctx.city)) s += 4;
  if (t.includes(ctx.dow)) s += 2;
  if (t.includes(ctx.seasonTag)) s += 2;
  if (t.includes(ctx.weatherTag)) s += 2;
  if (t.includes(ctx.vibe)) s += 2;
  interests.forEach(i => { if (t.includes(i)) s += 1; });
  if (feedback[item.id] === "save") s += 5;
  if (feedback[item.id] === "ignore") s -= 10;
  return s;
}

export function pick(
  cat: Modality,
  ctx: DecideContext,
  swap: number,
  interests: ReadonlySet<string>,
  feedback: FeedbackMap,
): Item {
  const ranked = catalog[cat]
    .map(it => ({ it, s: score(it, ctx, interests, feedback) + (it.id.charCodeAt(1) % 3) * 0.1 }))
    .sort((a, b) => b.s - a.s);
  const filtered = ranked.filter(r => feedback[r.it.id] !== "ignore");
  const idx = Math.min(swap, filtered.length - 1);
  return filtered[idx] ? filtered[idx].it : ranked[0].it;
}

export const MODALITIES: Modality[] = ["eat", "watch", "listen", "read", "do", "connect"];

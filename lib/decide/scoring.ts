import { catalog } from "./catalog";
import type { DecideContext, Item, Modality } from "./types";
import type { UserContext } from "@/lib/recommender/prompt";
import type { CandidateItem } from "@/lib/recommender/candidates";

export type FeedbackMap = Record<string, "save" | "swap" | "ignore" | "open" | undefined>;

// Catalog-vocabulary place tags. An item that carries one of these is claiming
// to be physically anchored to that city/metro; an item without any of them is
// location-free (movies, books, podcasts, generic recipes).
const PLACE_TAGS: ReadonlySet<string> = new Set(["dc", "la", "tokyo"]);

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

  // Locality penalty: if the item is anchored to a place that isn't the user's
  // current city, drop it well below any location-free item. -8 outweighs the
  // +4 city match plus typical tod/dow/season bonuses so the item only surfaces
  // when nothing else is available.
  const itemPlaces = t.filter(tag => PLACE_TAGS.has(tag));
  if (itemPlaces.length > 0 && !itemPlaces.includes(ctx.city)) s -= 8;

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

export function pickMany(
  cat: Modality,
  ctx: DecideContext,
  count: number,
  interests: ReadonlySet<string>,
  feedback: FeedbackMap,
  exclude: ReadonlySet<string> = new Set(),
): Item[] {
  return catalog[cat]
    .map(it => ({ it, s: score(it, ctx, interests, feedback) + (it.id.charCodeAt(1) % 3) * 0.1 }))
    .sort((a, b) => b.s - a.s)
    .filter(r => feedback[r.it.id] !== "ignore" && !exclude.has(r.it.id))
    .slice(0, count)
    .map(r => r.it);
}

export const MODALITIES: Modality[] = ["eat", "watch", "listen", "read", "do", "connect"];

/**
 * Score an AI-generated candidate against the user's live UserContext.
 *
 * Differs from `score()`/`pickMany()` (which run over the static catalog with a
 * richer DecideContext): this version operates on CandidateItems whose tags are
 * model-generated and on a thinner UserContext (tod/dow + weather description).
 *
 * Tag vocabulary expectations (enforced softly by the candidate prompt):
 *   - time-of-day:  "morning" | "afternoon" | "evening" | "late-night"
 *   - day class:    "weekday" | "weekend"
 *   - weather tag:  "clear" | "cloudy" | "rainy" | "snowy" | "foggy"
 */
export function scoreContextual(
  item: CandidateItem,
  ctx: UserContext,
  interests: ReadonlyArray<string>,
  patternTags: ReadonlyArray<string>,
  feedback: FeedbackMap,
): number {
  let s = 0;
  const t = item.tags;

  if (t.includes(ctx.tod)) s += 3;
  if (t.includes(ctx.dow)) s += 2;
  const weatherTag = ctx.weather.weatherTag;
  if (weatherTag && t.includes(weatherTag)) s += 2;

  for (const i of interests)   if (t.includes(i)) s += 1;
  // Behavioral patterns weight slightly more than stated interests.
  for (const p of patternTags) if (t.includes(p)) s += 2;

  if (feedback[item.id] === "save") s += 5;
  if (feedback[item.id] === "ignore") s -= 10;

  return s;
}

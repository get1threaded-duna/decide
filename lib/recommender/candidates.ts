/**
 * /lib/recommender/candidates.ts
 *
 * AI candidate generator. Calls Claude Haiku 4.5 to mint fresh CandidateItems
 * for a given category, anchored to the user's live context + profile and
 * told not to duplicate anything already shown.
 *
 * The static catalog (lib/decide/catalog.ts) is used only as a style / shape
 * reference, not as the source of items.
 *
 * Server-only: relies on ANTHROPIC_API_KEY via @anthropic-ai/sdk.
 */

import Anthropic from "@anthropic-ai/sdk";
import { catalog } from "@/lib/decide/catalog";
import type { Modality } from "@/lib/decide/types";

export type Category = Modality;

export interface CandidateItem {
  id: string;
  title: string;
  meta: string;
  tags: string[];
  fallback: string;
}

export interface GenerationContext {
  location: string;
  tempF: number;
  weatherDesc: string;
  localTime: string;
  tod: string;
  dow: string;
  dayName: string;
  sessionVibe: string;
}

export interface GenerationProfile {
  interests: string[];
  topPatternTags: string[];
  recentSaveTitles: string[];
  searchQuery: string;
}

const CATEGORY_NOUN: Record<Category, string> = {
  eat:     "things to eat — restaurants, dishes, takeout, or specific recipes",
  watch:   "things to watch — movies, TV episodes, shorts, or documentaries",
  listen:  "things to listen to — albums, podcasts, mixes, or specific tracks",
  read:    "things to read — articles, essays, books, or newsletter pieces",
  do:      "things to do — activities, errands, walks, micro-adventures",
  connect: "relational moves — texts to send, calls to make, plans to set",
};

// Categories where every item must be physically reachable from the user.
// Cooking-at-home picks under "eat" count as reachable (the kitchen is local);
// the radius constraint is enforced via prompt language rather than a hard filter.
const LOCATION_BOUND_CATEGORIES: ReadonlySet<Category> = new Set<Category>(["eat", "do", "connect"]);

const DEFAULT_RADIUS_MI = 25;

function slugify(title: string, idx: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "item"}-${idx}`;
}

export async function generateCandidates(
  category: Category,
  ctx: GenerationContext,
  profile: GenerationProfile,
  seenIds: string[],
): Promise<CandidateItem[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];

  const seedExamples = catalog[category].slice(0, 4).map((it) => ({
    title: it.title,
    meta: it.meta,
    tags: it.tags.slice(0, 6),
  }));

  const isLocationBound = LOCATION_BOUND_CATEGORIES.has(category);
  const localityRule = isLocationBound
    ? `LOCATION (HARD CONSTRAINT)
The user is in ${ctx.location}. EVERY item must be physically reachable from there within roughly ${DEFAULT_RADIUS_MI} miles. Use real neighborhood, street, venue, or business names that actually exist in or near ${ctx.location}. If a cook-at-home option fits the category, that counts as "reachable" since the kitchen is local. Do NOT recommend places in other cities, other metros, or other countries. If you cannot think of ${DEFAULT_RADIUS_MI}-mile options, broaden to the nearest metro center but never beyond.`
    : `LOCATION
The user is in ${ctx.location}, but ${category} is location-independent (it streams / reads / plays anywhere). Recommend the best fit regardless of geography.`;

  const system = `You generate fresh recommendations for a lifestyle app's "${category}" cards (${CATEGORY_NOUN[category]}). Items must be specific — real places, real titles, real things — not generic categories. Output is consumed by an algorithm: strict JSON, no prose.

${localityRule}

RULES:
- Generate EXACTLY 8 distinct items.
- Each item: { "title", "meta", "tags", "fallback" }. Do not include an "id" — the server assigns one.
- title: 2–8 words, specific.
- meta: ~6–14 words, with a concrete detail (price, runtime, location, duration, distance, channel).${isLocationBound ? " For location-bound picks, include the neighborhood or distance from the user where possible." : ""}
- tags: 4–8 lowercase single-word or kebab-case tokens. MUST include the time-of-day "${ctx.tod}" and the day class "${ctx.dow}" where natural, plus a weather-character tag (one of: clear, cloudy, rainy, snowy, foggy) when relevant. Interest tags should rhyme with the user's stated interests and save patterns. Avoid multi-clause tags.
- fallback: ONE sentence, ≤ 16 words, plain, no exclamation marks, no emojis.
- Do NOT recommend items that overlap conceptually with anything in ALREADY-SHOWN. New items only.
- Return ONLY JSON: { "items": [ {"title":"…","meta":"…","tags":["…"],"fallback":"…"}, ... ] }`;

  const userMessage = `CONTEXT
Location: ${ctx.location} · ${ctx.localTime}
Weather: ${ctx.tempF}°F, ${ctx.weatherDesc}
Time-of-day: ${ctx.tod} · ${ctx.dow}
Session vibe: ${ctx.sessionVibe}

USER
Interests: ${profile.interests.join(", ") || "not set"}
Save patterns (what they tend to like): ${profile.topPatternTags.join(", ") || "no clear pattern yet"}
Recent saves: ${profile.recentSaveTitles.slice(0, 5).map((t) => `"${t}"`).join("; ") || "none"}
${profile.searchQuery ? `Search intent: "${profile.searchQuery}"` : "No active search."}

ALREADY-SHOWN ids (avoid concept overlap with anything resembling these):
${seenIds.slice(-30).join(", ") || "(nothing yet)"}

SEED EXAMPLES (style and shape reference only — do NOT copy these titles):
${JSON.stringify(seedExamples, null, 2)}

Return 8 fresh items as: { "items": [...] }`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/```json|```/g, "");

    const parsed = JSON.parse(raw) as {
      items?: Array<{ title?: string; meta?: string; tags?: string[]; fallback?: string }>;
    };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];

    const seen = new Set(seenIds);
    return items
      .filter((it): it is { title: string; meta?: string; tags?: string[]; fallback?: string } =>
        typeof it?.title === "string" && it.title.length > 0,
      )
      .map((it, i) => {
        let id = slugify(it.title, i);
        while (seen.has(id)) id = `${id}-${Math.floor(Math.random() * 999)}`;
        seen.add(id);
        return {
          id,
          title: it.title,
          meta: it.meta ?? "",
          tags: Array.isArray(it.tags) ? it.tags.map(String) : [],
          fallback: it.fallback ?? "",
        };
      });
  } catch {
    return [];
  }
}

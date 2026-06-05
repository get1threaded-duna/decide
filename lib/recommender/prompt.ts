/**
 * /lib/recommender/prompt.ts
 *
 * Production prompt layer for Decide's recommendation engine.
 *
 * What changed from prototype:
 * - Derives a SESSION THEME from real weather + time + day before any card is picked
 * - Accepts a SEARCH QUERY so user intent weights all recommendations
 * - BATCHES all card reasons into one Claude call (3x cheaper, smarter cross-card coherence)
 * - Explicitly instructs Claude to PAIR cards 1 & 2 thematically
 * - Uses real weather numbers (tempF, description) not just abstract tags
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherContext {
  tempF: number;
  description: string;
  icon: string;
  location: string;
}

export interface UserContext {
  weather: WeatherContext;
  localTime: string;       // e.g. "Friday 6:48 PM"
  tod: string;             // "morning" | "afternoon" | "evening" | "late-night"
  dow: string;             // "weekday" | "weekend"
  dayName: string;         // "Friday"
}

export interface UserProfile {
  interests: string[];
  recentSaves: Array<{ title: string; category: string }>;
  recentPasses: Array<{ title: string }>;
  topPatternTags: Array<{ tag: string; count: number }>;
  searchQuery?: string;    // what the user typed in the search bar, if anything
}

export interface CardItem {
  id: string;
  title: string;
  meta: string;
  category: 'eat' | 'watch' | 'read' | 'do' | 'listen' | 'connect';
  fallback: string;
}

export interface BatchReasonResult {
  reasons: Record<string, string>;   // { [item.id]: reason_text }
  sessionTheme: SessionTheme;
}

export interface SessionTheme {
  label: string;           // e.g. "Friday wind-down — warm, heavy air"
  vibe: string;            // e.g. "low-effort, comfort-forward"
  moodTone: string;        // e.g. "easy-going" | "energetic" | "cozy" | "contemplative"
  pairedNarrative: string; // shared thread between cards 1 + 2 in this session
}

// ─── Session theme derivation ─────────────────────────────────────────────────

/**
 * Derive a human-readable session theme from real context signals.
 * This gets passed into the Claude prompt so ALL cards share a coherent tone.
 */
export function deriveSessionTheme(ctx: UserContext): SessionTheme {
  const { tempF, description } = ctx.weather;
  const { tod, dayName } = ctx;

  // Temperature band
  const tempBand =
    tempF >= 90 ? 'hot'
    : tempF >= 75 ? 'warm'
    : tempF >= 60 ? 'mild'
    : tempF >= 45 ? 'cool'
    : 'cold';

  // Weather character
  const weatherChar =
    description.includes('rain') || description.includes('drizzle') ? 'rainy'
    : description.includes('cloud') ? 'overcast'
    : description.includes('snow') ? 'snowy'
    : description.includes('fog') ? 'foggy'
    : 'clear';

  // Build the thematic matrix
  const matrix: Record<string, Record<string, { label: string; vibe: string; moodTone: string }>> = {
    evening: {
      rainy:    { label: `${dayName} rain night — stay-in energy`, vibe: 'cozy, low-effort, comfort-seeking', moodTone: 'cozy' },
      overcast: { label: `${dayName} evening — heavy-sky wind-down`, vibe: 'low-key, unhurried', moodTone: 'easy-going' },
      warm:     { label: `${dayName} warm evening — window-open hour`, vibe: 'light, open-ended', moodTone: 'easy-going' },
      hot:      { label: `${dayName} evening — cooling off`, vibe: 'cool-seeking, light touch', moodTone: 'easy-going' },
      clear:    { label: `${dayName} clear evening — good night for a walk first`, vibe: 'active then winding down', moodTone: 'balanced' },
    },
    morning: {
      rainy:    { label: `${dayName} rain morning — slow start`, vibe: 'warm, unhurried, indoors', moodTone: 'cozy' },
      clear:    { label: `${dayName} clear morning — good energy early`, vibe: 'movement-forward', moodTone: 'energetic' },
      warm:     { label: `${dayName} warm morning — get out before noon`, vibe: 'outdoor-leaning', moodTone: 'energetic' },
      overcast: { label: `${dayName} grey morning — focus conditions`, vibe: 'quiet, productive', moodTone: 'contemplative' },
      hot:      { label: `${dayName} hot morning — early or AC`, vibe: 'beat the heat or stay cool', moodTone: 'efficient' },
    },
    afternoon: {
      hot:      { label: `${dayName} afternoon — ${tempF}°F out there`, vibe: 'stay cool, shade-seeking', moodTone: 'easy-going' },
      rainy:    { label: `${dayName} rainy afternoon — good time to read`, vibe: 'low-effort, indoor', moodTone: 'contemplative' },
      clear:    { label: `${dayName} clear afternoon — open window`, vibe: 'light, exploratory', moodTone: 'energetic' },
      warm:     { label: `${dayName} ${tempF}° afternoon — transitional hour`, vibe: 'flexible, momentum-building', moodTone: 'balanced' },
      overcast: { label: `${dayName} overcast afternoon — soft focus`, vibe: 'steady, unhurried', moodTone: 'balanced' },
    },
    'late-night': {
      rainy:    { label: `Late ${dayName} — rain on the window`, vibe: 'introspective, slow, warm', moodTone: 'cozy' },
      clear:    { label: `Late ${dayName} — quiet and clear`, vibe: 'solo, deliberately chosen', moodTone: 'contemplative' },
      overcast: { label: `Late ${dayName} — overcast and still`, vibe: 'low stakes, winding fully down', moodTone: 'cozy' },
      warm:     { label: `Late ${dayName} — still warm out`, vibe: 'open-window energy, late-night light', moodTone: 'easy-going' },
      cold:     { label: `Late ${dayName} — cold night in`, vibe: 'blanket-and-headphones', moodTone: 'cozy' },
    },
  };

  const todMatrix = matrix[tod] ?? matrix.evening;
  const match = todMatrix[weatherChar] ?? todMatrix[tempBand] ?? todMatrix.clear ?? {
    label: `${dayName} ${tod}`,
    vibe: 'context-aware, personalized',
    moodTone: 'balanced'
  };

  // Paired narrative: the thematic thread cards 1+2 should share
  const pairedNarratives: Record<string, string> = {
    cozy:          'Both should feel like something you\'d choose on a night you\'re deliberately staying in.',
    energetic:     'Both should carry forward momentum — things that match the energy of starting strong.',
    contemplative: 'Both should reward a slower pace — the kind of pick you sit with rather than consume.',
    'easy-going':  'Both should be low-friction choices that feel right without requiring a decision.',
    balanced:      'The first two picks should rhyme in tone — one feeds into the other naturally.',
    efficient:     'Both should respect that your time and attention are limited right now.',
  };

  return {
    label: match.label,
    vibe: match.vibe,
    moodTone: match.moodTone,
    pairedNarrative: pairedNarratives[match.moodTone] ?? pairedNarratives.balanced,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build the complete batch prompt for generating all card reasons in one call.
 * Returns { system, user } for the Claude messages array.
 */
export function buildBatchPrompt(
  picks: CardItem[],
  profile: UserProfile,
  ctx: UserContext,
  theme: SessionTheme
): { system: string; user: string } {
  const { weather, localTime } = ctx;

  const savesSummary = profile.recentSaves.length
    ? profile.recentSaves.slice(0, 4).map(s => `"${s.title}" (${s.category})`).join('; ')
    : 'none yet';

  const passesSummary = profile.recentPasses.length
    ? profile.recentPasses.slice(0, 3).map(s => `"${s.title}"`).join('; ')
    : 'none';

  const patternSummary = profile.topPatternTags.length
    ? profile.topPatternTags.map(t => `${t.tag} (${t.count}x)`).join(', ')
    : 'no clear patterns yet';

  const searchLine = profile.searchQuery?.trim()
    ? `User searched for: "${profile.searchQuery.trim()}" — weight recommendations toward this intent.`
    : 'No active search query.';

  const cardList = picks.map((item, i) =>
    `${i + 1}. [${item.category.toUpperCase()}] ${item.title} — ${item.meta}`
  ).join('\n');

  const system = `You are the recommendation engine for Decide, a daily lifestyle app. Your job is to write one personalized reason per card — a single sentence that tells the user exactly why this specific pick fits them, right now.

VOICE: A friend who remembers what you like, texting a suggestion. Specific, warm, never generic.

RULES:
- ONE sentence per card. 16–24 words each. No more.
- Anchor each reason to at least one real signal: a save pattern, a context detail, or a stated interest.
- Cards 1 and 2 must share a thematic thread: ${theme.pairedNarrative}
- If the user has an active search query, that intent should shape the most relevant card(s).
- If the user has clear save patterns, lean into them BEFORE generic context.
- Use the actual temperature and weather description where natural — not just "warm/cold."
- NEVER: "perfect for", "tailored", "just for you", exclamation points, emojis, "since you saved", motivational stock phrases.
- Return ONLY a JSON object: { "reasons": { "[card_number]": "reason text" } } — no preamble, no backticks.`;

  const user = `SESSION THEME: ${theme.label}
SESSION VIBE: ${theme.vibe}

CURRENT CONDITIONS
Location: ${weather.location} · ${localTime}
Weather: ${weather.tempF}°F, ${weather.description}

USER
Interests: ${profile.interests.join(', ') || 'not set'}
Recent saves: ${savesSummary}
Recent passes: ${passesSummary}
Save patterns: ${patternSummary}
${searchLine}

CARDS TO REASON (in order — cards 1 and 2 must thematically pair):
${cardList}

Return JSON only: { "reasons": { "1": "...", "2": "...", ... } }`;

  return { system, user };
}

// ─── Batch generation call ────────────────────────────────────────────────────

/**
 * Call Claude once for all card reasons.
 * Returns a map of item.id → reason string.
 * Falls back to item.fallback per card on any failure.
 *
 * Server-only: uses ANTHROPIC_API_KEY via the @anthropic-ai/sdk client.
 */
export async function generateBatchReasons(
  picks: CardItem[],
  profile: UserProfile,
  ctx: UserContext
): Promise<BatchReasonResult> {
  const theme = deriveSessionTheme(ctx);
  const { system, user } = buildBatchPrompt(picks, profile, ctx, theme);

  const buildFallback = (): BatchReasonResult => {
    const map: Record<string, string> = {};
    picks.forEach((item) => { map[item.id] = item.fallback; });
    return { reasons: map, sessionTheme: theme };
  };

  if (!process.env.ANTHROPIC_API_KEY) return buildFallback();

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .replace(/```json|```/g, '');

    const parsed = JSON.parse(raw) as { reasons?: Record<string, string> };
    const reasonMap: Record<string, string> = {};
    picks.forEach((item, i) => {
      const key = String(i + 1);
      reasonMap[item.id] = parsed?.reasons?.[key]?.trim() || item.fallback;
    });

    return { reasons: reasonMap, sessionTheme: theme };
  } catch {
    return buildFallback();
  }
}

// ─── Search intent scorer ─────────────────────────────────────────────────────

/**
 * Score boost based on how much a search query matches an item.
 * Called inside your existing score() function: return score(item, ctx, interests, feedback) + searchBoost(item, query)
 */
export function searchBoost(item: CardItem & { tags: string[] }, query: string): number {
  if (!query?.trim()) return 0;
  const q = query.toLowerCase();
  const titleMatch = item.title.toLowerCase().includes(q) ? 4 : 0;
  const tagMatch = item.tags.some(t => t.includes(q) || q.includes(t)) ? 2 : 0;
  const metaMatch = item.meta.toLowerCase().includes(q) ? 1 : 0;
  return titleMatch + tagMatch + metaMatch;
}

// ─── Cache key (updated for search + theme) ───────────────────────────────────

/**
 * Updated cache key — now includes searchQuery and weather snapshot.
 * Invalidates when: context changes, user saves, interests toggle, or search query changes.
 */
export function buildCacheKey(
  itemId: string,
  ctxId: string,
  interestKey: string,
  saveCount: number,
  searchQuery = '',
  weatherSnapshot = ''
): string {
  return `${itemId}::${ctxId}::${interestKey}::s${saveCount}::q${searchQuery.slice(0, 20)}::w${weatherSnapshot.slice(0, 12)}`;
}

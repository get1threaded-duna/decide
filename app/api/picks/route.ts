/**
 * /app/api/picks/route.ts
 *
 * Pool refresh for the swap flow. Mints fresh AI-generated candidates per
 * request, ranks them against the user's interests + behavioral patterns,
 * batch-generates reasons, and returns the resolved pool.
 *
 * POST body:
 *   {
 *     category: Modality,
 *     seenIds: string[],
 *     context: UserContext,
 *     poolSize?: number,        // default 5
 *     searchQuery?: string,
 *     sessionVibe?: string,
 *   }
 *
 * Response:
 *   { candidates: CandidateItem[], reasons: Record<string,string>, sessionTheme }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCandidates, type Category, type CandidateItem } from "@/lib/recommender/candidates";
import {
  deriveSessionTheme,
  generateBatchReasons,
  type CardItem,
  type UserContext,
  type UserProfile,
} from "@/lib/recommender/prompt";
import { scoreContextual, MODALITIES, type FeedbackMap } from "@/lib/decide/scoring";

export const runtime = "nodejs";

const MODALITY_SET = new Set<Category>(MODALITIES);

// Tags that aren't useful as "behavioral pattern" signals — they're already
// scored via tod/dow elsewhere.
const GENERIC_PATTERN_TAGS = new Set([
  "morning", "afternoon", "evening", "late-night",
  "weekday", "weekend", "solo", "social",
]);

interface PicksRequestBody {
  category: Category;
  seenIds?: string[];
  context: UserContext;
  poolSize?: number;
  searchQuery?: string;
  sessionVibe?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as PicksRequestBody;
    const { category, context, searchQuery = "", sessionVibe = "context-aware" } = body;
    const seenIds = Array.isArray(body.seenIds) ? body.seenIds : [];
    const poolSize = Math.min(Math.max(body.poolSize ?? 5, 1), 10);

    if (!category || !MODALITY_SET.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!context?.weather || typeof context.tod !== "string") {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }

    // 1. Load profile + recent feedback in parallel.
    const [profileResult, feedbackResult] = await Promise.all([
      supabase.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("feedback_log")
        .select("item_id, action, item_snapshot")
        .eq("user_id", user.id)
        .order("ts", { ascending: false })
        .limit(50),
    ]);

    const interests: string[] = Array.isArray(profileResult.data?.interests)
      ? (profileResult.data!.interests as string[])
      : [];
    const feedbackRows = feedbackResult.data ?? [];

    // Build feedback map + pattern tags from recent saves.
    const feedback: FeedbackMap = {};
    const saveTitles: string[] = [];
    const passTitles: string[] = [];
    const tagCounts: Record<string, number> = {};

    for (const row of feedbackRows) {
      const action = row.action as FeedbackMap[string];
      const snapshot = row.item_snapshot as { title?: string; tags?: string[] } | null;

      if (action === "save" || action === "ignore") {
        feedback[row.item_id as string] = action;
      }
      if (action === "save" && snapshot) {
        if (snapshot.title) saveTitles.push(snapshot.title);
        for (const tag of snapshot.tags ?? []) {
          if (!GENERIC_PATTERN_TAGS.has(tag)) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
      }
      if (action === "ignore" && snapshot?.title) {
        passTitles.push(snapshot.title);
      }
    }

    const topPatternTags = Object.entries(tagCounts)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    // 2. Generate fresh candidates from Claude.
    const genCtx = {
      location: context.weather.location,
      tempF: context.weather.tempF,
      weatherDesc: context.weather.description,
      localTime: context.localTime,
      tod: context.tod,
      dow: context.dow,
      dayName: context.dayName,
      sessionVibe,
    };
    const genProfile = {
      interests,
      topPatternTags,
      recentSaveTitles: saveTitles.slice(0, 5),
      searchQuery,
    };

    const candidates: CandidateItem[] = await generateCandidates(category, genCtx, genProfile, seenIds);
    if (candidates.length === 0) {
      return NextResponse.json({ error: "No candidates generated" }, { status: 502 });
    }

    // 3. Score + rank (canonical scoring fn from lib/decide/scoring.ts).
    const scored = candidates
      .filter((c) => feedback[c.id] !== "ignore")
      .map((c) => ({
        item: c,
        score: scoreContextual(c, context, interests, topPatternTags, feedback) + Math.random() * 0.2,
      }))
      .sort((a, b) => b.score - a.score);

    const pool = scored.slice(0, poolSize).map((s) => s.item);

    // 4. Batch reasons over the resolved pool.
    const theme = deriveSessionTheme(context);
    const cardItems: CardItem[] = pool.map((it) => ({
      id: it.id,
      title: it.title,
      meta: it.meta,
      category,
      fallback: it.fallback,
    }));
    const profileForReasons: UserProfile = {
      interests,
      recentSaves: saveTitles.slice(0, 4).map((t) => ({ title: t, category })),
      recentPasses: passTitles.slice(0, 3).map((t) => ({ title: t })),
      topPatternTags: topPatternTags.map((t) => ({ tag: t, count: tagCounts[t] ?? 2 })),
      searchQuery,
    };
    const { reasons } = await generateBatchReasons(cardItems, profileForReasons, context);

    return NextResponse.json({
      candidates: pool,
      reasons,
      sessionTheme: theme,
    });
  } catch (err) {
    console.error("[/api/picks]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

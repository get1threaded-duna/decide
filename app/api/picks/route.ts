import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contexts, DEFAULT_CONTEXT_ID } from "@/lib/decide/contexts";
import { pickMany, type FeedbackMap } from "@/lib/decide/scoring";
import type { Modality } from "@/lib/decide/types";

export const runtime = "nodejs";

const MODALITIES = new Set<Modality>(["eat", "watch", "listen", "read", "do", "connect"]);

const DEFAULT_INTERESTS = new Set([
  "comfort", "business", "food", "real-estate", "music", "outdoor",
  "ai", "homesteading", "hiphop", "family", "brotherhood",
]);

interface PicksRequest {
  modality: Modality;
  contextId?: string;
  exclude?: string[];
  count?: number;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as PicksRequest;
  if (!MODALITIES.has(body.modality)) {
    return NextResponse.json({ error: "Invalid modality" }, { status: 400 });
  }

  const ctx = contexts[body.contextId ?? ""] ?? contexts[DEFAULT_CONTEXT_ID];
  const exclude = new Set(body.exclude ?? []);
  const count = Math.min(Math.max(body.count ?? 5, 1), 20);

  const [{ data: profile }, { data: logRows }, { data: savedRows }] = await Promise.all([
    supabase.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("feedback_log")
      .select("action, item_id")
      .eq("user_id", user.id),
    supabase.from("saved_items").select("item_id").eq("user_id", user.id),
  ]);

  const storedInterests = Array.isArray(profile?.interests) ? (profile.interests as string[]) : [];
  const interestSet = storedInterests.length > 0 ? new Set(storedInterests) : DEFAULT_INTERESTS;

  const feedback: FeedbackMap = {};
  for (const row of logRows ?? []) {
    feedback[row.item_id as string] = row.action as FeedbackMap[string];
  }
  for (const row of savedRows ?? []) {
    feedback[row.item_id as string] = "save";
  }

  const items = pickMany(body.modality, ctx, count, interestSet, feedback, exclude);

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      title: it.title,
      meta: it.meta,
      fallback: it.fallback,
    })),
  });
}

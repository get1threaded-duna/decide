import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findItem } from "@/lib/decide/catalog";
import { contexts } from "@/lib/decide/contexts";
import { derivePatterns } from "@/lib/decide/patterns";
import type { FeedbackEntry, Modality } from "@/lib/decide/types";

export const runtime = "nodejs";

const SYSTEM = `You write one-line recommendations for "Decide," a lifestyle app. Tone: a friend who remembers what you like, texting a suggestion.

Generate ONE sentence (16-24 words). Anchor it to at least one signal from the user:
- a recent save (mention it naturally, not "since you saved X")
- a pattern in their saves (e.g., they keep saving Korean food)
- a context detail (weather, city, time, vibe)
- a stated interest

If they have NO save history, lean fully on context and stated interests.
If they have patterns, lean into the patterns FIRST.

Avoid: "perfect for", "tailored", "just for you", exclamation points, emojis, stock motivational phrases, opening with "since you".

Write only the sentence, no quotes, no preamble.`;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as {
    itemId?: string;
    category?: Modality;
    contextId?: string;
    interests?: string[];
  };

  const item = body.itemId ? findItem(body.itemId) : undefined;
  const ctx = body.contextId ? contexts[body.contextId] : undefined;
  if (!item || !ctx) return new Response("Bad request", { status: 400 });

  // Pull this user's feedback log to derive patterns
  const { data: logRows } = await supabase
    .from("feedback_log")
    .select("action, item_snapshot, ts")
    .eq("user_id", user.id)
    .order("ts", { ascending: true });

  const log: FeedbackEntry[] = (logRows ?? [])
    .filter(r => r.item_snapshot)
    .map(r => ({
      action: r.action as FeedbackEntry["action"],
      item: r.item_snapshot as FeedbackEntry["item"],
      ts: new Date(r.ts as string).getTime(),
    }));
  const patterns = derivePatterns(log);

  const interests = body.interests ?? [];

  const recentSavesLine = patterns.recentSaves.length
    ? patterns.recentSaves.slice(0, 3).map(s => `"${s.item.title}" (${s.item.category})`).join("; ")
    : "none yet";
  const recentPassesLine = patterns.recentPasses.length
    ? patterns.recentPasses.map(s => `"${s.item.title}"`).join("; ")
    : "none";
  const patternsLine = patterns.topTags.length
    ? patterns.topTags.map(t => `${t.tag} (saved ${t.count}x)`).join(", ")
    : "no clear patterns yet — early days";

  const userMessage = `USER
- Stated interests: ${interests.join(", ") || "unknown"}
- Recent saves (newest first): ${recentSavesLine}
- Recently passed on: ${recentPassesLine}
- Patterns noticed: ${patternsLine}

CONTEXT
${ctx.loc} · ${ctx.time} · ${ctx.weather} · vibe is ${ctx.vibe}

ITEM (${body.category})
${item.title} — ${item.meta}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sdkStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMessage }],
        });

        sdkStream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        await sdkStream.finalMessage();
        controller.close();
      } catch (err) {
        console.error("[/api/reason] anthropic stream failed", err);
        controller.enqueue(encoder.encode(item.fallback));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

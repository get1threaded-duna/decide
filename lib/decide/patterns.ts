import type { DerivedPatterns, FeedbackEntry } from "./types";

const GENERIC_TAGS = new Set(["weekend", "weekday", "morning", "evening", "late-night", "generic", "anytime", "home"]);

export function derivePatterns(log: FeedbackEntry[]): DerivedPatterns {
  const saves = log.filter(e => e.action === "save");
  const passes = log.filter(e => e.action === "ignore");
  const recentSaves = saves.slice(-5).reverse();
  const recentPasses = passes.slice(-3).reverse();

  const tagCounts: Record<string, number> = {};
  for (const s of recentSaves) {
    for (const tag of s.item.tags) {
      if (GENERIC_TAGS.has(tag)) continue;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  return { recentSaves, recentPasses, topTags, saveCount: saves.length };
}

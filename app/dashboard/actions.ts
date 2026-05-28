"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findItem } from "@/lib/decide/catalog";
import type { Modality } from "@/lib/decide/types";

export async function toggleSave(itemId: string, category: Modality) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const item = findItem(itemId);
  if (!item) throw new Error(`Unknown item: ${itemId}`);

  const { data: existing } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_items").delete().eq("id", existing.id);
    revalidatePath("/dashboard");
    return { saved: false };
  }

  await supabase.from("saved_items").insert({
    user_id: user.id,
    item_id: itemId,
    category,
  });

  await supabase.from("feedback_log").insert({
    user_id: user.id,
    item_id: itemId,
    action: "save",
    item_snapshot: {
      id: item.id,
      title: item.title,
      tags: item.tags,
      category,
    },
  });

  revalidatePath("/dashboard");
  return { saved: true };
}

export async function logIgnore(itemId: string, category: Modality) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const item = findItem(itemId);
  if (!item) throw new Error(`Unknown item: ${itemId}`);

  await supabase.from("feedback_log").insert({
    user_id: user.id,
    item_id: itemId,
    action: "ignore",
    item_snapshot: {
      id: item.id,
      title: item.title,
      tags: item.tags,
      category,
    },
  });

  revalidatePath("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveInterests(interests: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ interests })
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/tune");
  revalidatePath("/dashboard");
}

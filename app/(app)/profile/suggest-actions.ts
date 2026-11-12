"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(app)/connections/actions";
import { createClient } from "@/lib/supabase/server";

// Letters, numbers, spaces and a few symbols, so "C++", "UI/UX" and "R&D" work
const NAME_RE = /^[\p{L}\p{N} +#./&-]{2,40}$/u;

export async function suggestSkill(name: string): Promise<ActionResult> {
  const text = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!NAME_RE.test(text)) return { error: "Use 2–40 letters, numbers, or + # . / & -" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not logged in." };

  const { error } = await supabase.from("skill_suggestions").insert({ user_id: user.id, name: text });
  if (error) {
    if (error.code === "SK001") return { error: error.message };
    if (error.code === "23505") return { error: "Someone already suggested that. Thanks!" };
    return { error: "Couldn't send your suggestion." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}
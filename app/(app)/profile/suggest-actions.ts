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

  const { error } = await supabase.rpc("suggest_skill", { p_name: text });
  if (error) {
    return { error: error.code === "SK001" ? error.message : "Couldn't send your suggestion." };
  }

  revalidatePath("/", "layout");
  return { error: null };
}
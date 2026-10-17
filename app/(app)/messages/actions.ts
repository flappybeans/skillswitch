"use server";

import { isUuid } from "@/lib/form";
import { MESSAGE_MAX } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";

// A discriminated union: `error` tells TS which shape you have
export type SendResult =
  | { error: string; message: null }
  | { error: null; message: Message };

export async function sendMessage(
  receiverId: string,
  content: string
): Promise<SendResult> {
  const fail = (error: string): SendResult => ({ error, message: null });

  if (!isUuid(receiverId)) return fail("Invalid recipient.");
  const text = content.trim();
  if (text.length < 1 || text.length > MESSAGE_MAX) {
    return fail(`Messages must be 1–${MESSAGE_MAX} characters.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You're not logged in.");
  if (receiverId === user.id) return fail("You can't message yourself.");

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: user.id, receiver_id: receiverId, content: text })
    .select("*")
    .single();

  if (error || !data) {
    // 42501 = the RLS policy refused: not connected (or deactivated)
    if (error?.code === "42501") {
      return fail("You can only message people you're connected with.");
    }
    return fail("Couldn't send. Try again.");
  }

  return { error: null, message: data };
}
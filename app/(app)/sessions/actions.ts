"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(app)/connections/actions";
import { isUuid } from "@/lib/form";
import { SESSION_DURATIONS } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

const OK: ActionResult = { error: null };
const fail = (error: string): ActionResult => ({ error });
const refresh = () => revalidatePath("/", "layout");

// Our SQL functions raise this SQLSTATE when the message is safe to show a user
const USER_ERROR = "SK001";

function explain(error: { code: string; message: string }, fallback: string): string {
  return error.code === USER_ERROR ? error.message : fallback;
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

// All arguments come from the browser, so every one is validated here.
export async function proposeSession(
  peerId: string,
  role: string, // "teach" = I'm the tutor, "learn" = they are
  skillId: string,
  startsAtIso: string,
  durationMin: number
): Promise<ActionResult> {
  if (!isUuid(peerId) || !isUuid(skillId)) return fail("Invalid request.");
  if (role !== "teach" && role !== "learn") return fail("Invalid request.");
  if (!(SESSION_DURATIONS as readonly number[]).includes(durationMin)) {
    return fail("Pick a duration from the list.");
  }

  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return fail("Pick a valid date and time.");
  if (startsAt.getTime() < Date.now() + 10 * 60_000) {
    return fail("Sessions must start at least 10 minutes from now.");
  }

  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");
  const { supabase, user } = ctx;
  if (peerId === user.id) return fail("Pick someone else.");

  const iTeach = role === "teach";
  const { error } = await supabase.from("sessions").insert({
    tutor_id: iTeach ? user.id : peerId,
    student_id: iTeach ? peerId : user.id,
    skill_id: skillId,
    scheduled_at: startsAt.toISOString(),
    duration_min: durationMin,
    proposed_by: user.id,
  });

  if (error) {
    // 42501 = the RLS policy refused: not connected, or the time is out of range
    if (error.code === "42501") {
      return fail("You can only schedule sessions with your connections, at a future time.");
    }
    if (error.code === "23503") return fail("That person or skill doesn't exist.");
    return fail(explain(error, "Couldn't schedule the session."));
  }

  refresh();
  return OK;
}

export async function respondToSession(
  sessionId: string,
  accept: boolean
): Promise<ActionResult> {
  if (!isUuid(sessionId)) return fail("Invalid session.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");

  const { error } = await ctx.supabase.rpc("respond_to_session", {
    p_session: sessionId,
    p_accept: accept === true,
  });
  if (error) return fail(explain(error, "Couldn't update the session."));

  refresh();
  return OK;
}

export async function cancelSession(sessionId: string): Promise<ActionResult> {
  if (!isUuid(sessionId)) return fail("Invalid session.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");

  const { error } = await ctx.supabase.rpc("cancel_session", { p_session: sessionId });
  if (error) return fail(explain(error, "Couldn't cancel the session."));

  refresh();
  return OK;
}

export async function markSessionDone(sessionId: string): Promise<ActionResult> {
  if (!isUuid(sessionId)) return fail("Invalid session.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");

  const { error } = await ctx.supabase.rpc("mark_session_done", { p_session: sessionId });
  if (error) return fail(explain(error, "Couldn't confirm the session."));

  refresh();
  return OK;
}
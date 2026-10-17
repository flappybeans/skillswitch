"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

const OK: ActionResult = { error: null };
const fail = (error: string): ActionResult => ({ error });
const refresh = () => revalidatePath("/", "layout");

// The type of the Supabase client, derived instead of written by hand
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

// Accept or decline. RLS only lets the addressee do this, on pending rows.
async function respond(
  supabase: Supabase,
  connectionId: string,
  status: "accepted" | "rejected"
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("connections")
    .update({ status })
    .eq("id", connectionId)
    .eq("status", "pending")
    .select("id"); // count the changed rows (the silent-RLS lesson from Phase 4)

  if (error || !data || data.length === 0) {
    return fail("That request is no longer available.");
  }
  refresh();
  return OK;
}

export async function sendRequest(addresseeId: string): Promise<ActionResult> {
  if (!isUuid(addresseeId)) return fail("Invalid user.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");
  const { supabase, userId } = ctx;
  if (addresseeId === userId) return fail("You can't connect with yourself.");

  const { error } = await supabase
    .from("connections")
    .insert({ requester_id: userId, addressee_id: addresseeId });

  if (!error) {
    refresh();
    return OK;
  }
  if (error.code !== "23505") {
    return fail(
      error.code === "23503" ? "That user doesn't exist." : "Couldn't send the request."
    );
  }

  // 23505: a row for this pair already exists (the unique index from Phase 2).
  // Work out what it means.
  const { data: existing } = await supabase
    .from("connections")
    .select("id, requester_id, status")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),` +
        `and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`
    )
    .maybeSingle();

  if (!existing) return fail("Couldn't send the request.");

  if (existing.status === "accepted") {
    refresh();
    return OK; // already connected
  }
  if (existing.requester_id === userId) {
    return fail("You've already sent this person a request.");
  }

  // From here on, THEY are the requester.
  if (existing.status === "pending") {
    // They already asked you, and now you asked them: both want it. Connect.
    return respond(supabase, existing.id, "accepted");
  }

  // They asked, you declined earlier, and now you've changed your mind.
  // Replace the old row with a request from you.
  const { error: deleteError } = await supabase
    .from("connections")
    .delete()
    .eq("id", existing.id);
  if (deleteError) return fail("Couldn't send the request.");

  const retry = await supabase
    .from("connections")
    .insert({ requester_id: userId, addressee_id: addresseeId });
  if (retry.error) return fail("Couldn't send the request.");

  refresh();
  return OK;
}

export async function acceptRequest(connectionId: string): Promise<ActionResult> {
  if (!isUuid(connectionId)) return fail("Invalid request.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");
  return respond(ctx.supabase, connectionId, "accepted");
}

export async function declineRequest(connectionId: string): Promise<ActionResult> {
  if (!isUuid(connectionId)) return fail("Invalid request.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");
  return respond(ctx.supabase, connectionId, "rejected");
}

export async function cancelRequest(connectionId: string): Promise<ActionResult> {
  if (!isUuid(connectionId)) return fail("Invalid request.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");

  const { data, error } = await ctx.supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .eq("requester_id", ctx.userId)
    .eq("status", "pending")
    .select("id");

  if (error || !data || data.length === 0) return fail("Couldn't cancel the request.");
  refresh();
  return OK;
}

export async function removeConnection(connectionId: string): Promise<ActionResult> {
  if (!isUuid(connectionId)) return fail("Invalid connection.");
  const ctx = await authed();
  if (!ctx) return fail("You're not logged in.");

  // RLS only lets you delete rows you're part of
  const { data, error } = await ctx.supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .eq("status", "accepted")
    .select("id");

  if (error || !data || data.length === 0) return fail("Couldn't remove the connection.");
  refresh();
  return OK;
}
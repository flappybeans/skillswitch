"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(app)/connections/actions";
import { getAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const OK: ActionResult = { error: null };
const fail = (error: string): ActionResult => ({ error });
const refresh = () => revalidatePath("/", "layout");

// Our SQL functions raise this SQLSTATE when the message is safe to show
const USER_ERROR = "SK001";
function explain(error: { code: string; message: string }, fallback: string): string {
  return error.code === USER_ERROR ? error.message : fallback;
}

// Notes come from the browser: whatever TS says, check the type and cap the length
function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BAN_FOREVER = "876000h"; // about 100 years

// 1) The database checks admin rights, blocks self/admin targets, and writes the audit row.
// 2) Then the login ban, which only the service-role client can do.
// Both steps are safe to repeat if the second one fails.
async function setActive(
  supabase: Supabase,
  userId: string,
  active: boolean,
  reason: string
): Promise<ActionResult> {
  const { error } = await supabase.rpc("admin_set_active", {
    p_user: userId,
    p_active: active,
    p_reason: reason,
  });
  if (error) return fail(explain(error, "Couldn't update that account."));

  const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : BAN_FOREVER,
  });
  if (banError) {
    return fail(
      active
        ? "Reactivated in the app, but removing the login ban failed. Try again."
        : "Deactivated in the app, but blocking the login failed. Try again."
    );
  }
  return OK;
}

export async function setUserActive(
  userId: string,
  active: boolean,
  reason: string
): Promise<ActionResult> {
  if (!isUuid(userId)) return fail("Invalid user.");
  const admin = await getAdmin();
  if (!admin) return fail("Not allowed.");

  const supabase = await createClient();
  const result = await setActive(supabase, userId, active === true, clean(reason));
  refresh(); // even after a partial failure, the database may have changed
  return result;
}

export async function actOnFlag(
  flagId: string,
  action: string,
  note: string
): Promise<ActionResult> {
  if (!isUuid(flagId)) return fail("Invalid flag.");
  if (action !== "dismiss" && action !== "deactivate") return fail("Invalid action.");
  // From here on, TS knows `action` is "dismiss" | "deactivate"

  const admin = await getAdmin();
  if (!admin) return fail("Not allowed.");

  const text = clean(note);
  const supabase = await createClient();

  // Look the flag up ourselves: never trust a user id sent from the browser
  const { data: flag } = await supabase
    .from("flags")
    .select("id, user_id, status")
    .eq("id", flagId)
    .maybeSingle();
  if (!flag || flag.status !== "open") return fail("That flag was already handled.");

  if (action === "deactivate") {
    const result = await setActive(supabase, flag.user_id, false, text || "Flagged for suspicious activity");
    if (result.error) {
      refresh();
      return result;
    }
  }

  const { error } = await supabase.rpc("admin_resolve_flag", {
    p_flag: flag.id,
    p_status: action === "deactivate" ? "actioned" : "dismissed",
    p_note: text,
  });
  refresh();
  if (error) return fail(explain(error, "Couldn't update the flag."));
  return OK;
}

export async function revertEvent(eventId: string, note: string): Promise<ActionResult> {
  if (!isUuid(eventId)) return fail("Invalid event.");
  const admin = await getAdmin();
  if (!admin) return fail("Not allowed.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revert_event", {
    p_event: eventId,
    p_note: clean(note),
  });
  if (error) return fail(explain(error, "Couldn't revert those points."));

  refresh();
  return OK;
}

export type ScanResult = { error: string | null; added: number };

export async function runScan(): Promise<ScanResult> {
  const admin = await getAdmin();
  if (!admin) return { error: "Not allowed.", added: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_fraud_scan");
  if (error) return { error: explain(error, "The scan failed."), added: 0 };

  refresh();
  return { error: null, added: data ?? 0 };
}

export async function resolveSuggestion(
  id: string,
  action: string,
  target: string
): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Invalid suggestion.");
  if (action !== "approve" && action !== "reject" && action !== "merge") return fail("Invalid action.");
  if (action === "merge" && !isUuid(target)) return fail("Pick the skill to merge into.");

  const admin = await getAdmin();
  if (!admin) return fail("Not allowed.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_suggestion", {
    p_id: id,
    p_action: action,
    p_target: action === "merge" ? target : undefined,
  });
  if (error) return fail(explain(error, "Couldn't update that suggestion."));

  refresh();
  return OK;
}
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/form";

export type FlagDetails = Record<string, Json | undefined>;

// `details` is a jsonb column, so TS types it as the whole Json union (string | number | array | ...).
// These checks narrow it down to "an object" before we read keys from it.
export function asDetails(value: Json): FlagDetails {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function num(d: FlagDetails, key: string): number {
  const v = d[key];
  return typeof v === "number" ? v : 0;
}

function str(d: FlagDetails, key: string): string {
  const v = d[key];
  return typeof v === "string" ? v : "?";
}

// The other person in a pair flag, if the details name one (validated before we query with it)
export function partnerOf(d: FlagDetails): string | null {
  const v = d.partner;
  return typeof v === "string" && isUuid(v) ? v : null;
}

const FLAG_TITLE: Record<string, string> = {
  pair_repeat: "Repeated pairing",
  reciprocal_swaps: "Reciprocal swapping",
  burst_sessions: "Session burst",
  point_spike: "Point spike",
  new_account_one_partner: "New account, one partner",
};

export function flagTitle(type: string): string {
  return FLAG_TITLE[type] ?? type;
}

export function describeFlag(type: string, d: FlagDetails, partner: string | null): string {
  const who = partner ?? "the same person";
  switch (type) {
    case "pair_repeat":
      return `${num(d, "sessions")} completed sessions with ${who} in ${num(d, "window_days")} days.`;
    case "reciprocal_swaps":
      return `Taught ${who} ${num(d, "taught")}× and learned from them ${num(d, "learned")}× in ${num(d, "window_days")} days.`;
    case "burst_sessions":
      return `${num(d, "sessions")} completed sessions (${num(d, "minutes")} min) on ${str(d, "day")}.`;
    case "point_spike":
      return `Earned ${num(d, "points_7d")} points in 7 days. The platform median is ${Math.round(num(d, "median_7d"))}.`;
    case "new_account_one_partner":
      return `New account with ${num(d, "points")} points, all from sessions with ${who}.`;
    default:
      return "Flagged by a rule that isn't described here yet.";
  }
}

const ACTION_LABEL: Record<string, string> = {
  deactivate_user: "Deactivated",
  reactivate_user: "Reactivated",
  dismiss_flag: "Dismissed a flag on",
  action_flag: "Actioned a flag on",
  revert_points: "Reverted points for",
};

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

export function eventLabel(reason: string): string {
  if (reason.startsWith("revert:")) return "Reverted by an admin";
  switch (reason) {
    case "taught_session":
      return "Taught a session";
    case "learned_session":
      return "Learned in a session";
    case "weekly_pair_cap":
      return "Weekly pair limit reached";
    default:
      return reason;
  }
}
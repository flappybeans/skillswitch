import type { Session } from "@/lib/types";

export const SESSION_DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;

// Display-only copy of the rules in award_session_points(). Keep in sync with the database.
export const BLOCK_MINUTES = 15;
export const TUTOR_POINTS_PER_BLOCK = 5;
export const STUDENT_POINTS_PER_BLOCK = 2;
export const WEEKLY_PAIR_CAP = 2;

export function pointsFor(durationMin: number): { tutor: number; student: number } {
  const blocks = Math.max(Math.floor(durationMin / BLOCK_MINUTES), 1);
  return {
    tutor: blocks * TUTOR_POINTS_PER_BLOCK,
    student: blocks * STUDENT_POINTS_PER_BLOCK,
  };
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ${h === 1 ? "hour" : "hours"}` : `${h} h ${m} min`;
}

// The database stores status as plain text. This is the union TS can check.
export type DisplayStatus = "pending" | "confirmed" | "completed" | "cancelled" | "expired";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function endsAtMs(s: Pick<Session, "scheduled_at" | "duration_min">): number {
  return Date.parse(s.scheduled_at) + s.duration_min * 60_000;
}

export function displayStatus(
  s: Pick<Session, "status" | "scheduled_at">,
  nowMs: number
): DisplayStatus {
  switch (s.status) {
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "confirmed":
      return "confirmed";
    default:
      // "pending": nobody answered before the start time
      return nowMs >= Date.parse(s.scheduled_at) ? "expired" : "pending";
  }
}

export type SessionGroup = "incoming" | "proposed" | "ready" | "upcoming" | "history";

export function groupOf(s: Session, meId: string, nowMs: number): SessionGroup {
  switch (displayStatus(s, nowMs)) {
    case "pending":
      return s.proposed_by === meId ? "proposed" : "incoming";
    case "confirmed":
      return nowMs >= endsAtMs(s) ? "ready" : "upcoming";
    default:
      return "history"; // completed, cancelled, expired
  }
}
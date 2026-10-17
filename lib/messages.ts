import type { Message } from "@/lib/types";

export const MESSAGE_MAX = 2000; // matches the check constraint from Phase 2
export const PAGE_SIZE = 40;

// PostgREST filter for "messages between these two people, in either direction".
// Safe to interpolate: both ids are uuids from auth or the database, never raw user input.
export function threadFilter(a: string, b: string): string {
  return (
    `and(sender_id.eq.${a},receiver_id.eq.${b}),` +
    `and(sender_id.eq.${b},receiver_id.eq.${a})`
  );
}

// Realtime payloads arrive untyped. Check the shape instead of lying with `as Message`.
export function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.sender_id === "string" &&
    typeof m.receiver_id === "string" &&
    typeof m.content === "string" &&
    typeof m.created_at === "string"
  );
}

// Add a message unless we already have it (the send action AND realtime can both deliver it)
export function withMessage(list: Message[], message: Message): Message[] {
  return list.some((m) => m.id === message.id) ? list : [...list, message];
}
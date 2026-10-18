export type StampStyle = "time" | "short" | "day" | "full";

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// time  → "3:42 PM"
// short → time if today, otherwise "Oct 4"
// day   → "Today" / "Yesterday" / "Sat, Oct 4"
// full  → "Sat, Oct 4, 3:42 PM"
export function formatStamp(iso: string, style: StampStyle): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (style === "time") return time;

  if (style === "full") {
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const now = new Date();
  if (style === "short") {
    return sameDay(date, now)
      ? time
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
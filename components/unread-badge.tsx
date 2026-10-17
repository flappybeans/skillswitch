import { getUnread } from "@/lib/unread";
import { UnreadCount } from "./unread-count";

export async function UnreadBadge() {
  const unread = await getUnread();
  if (!unread) return null;

  // key: if the server ever sends a new count, remount with it as the starting value
  return <UnreadCount key={unread.count} userId={unread.userId} initial={unread.count} />;
}
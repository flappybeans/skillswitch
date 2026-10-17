"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/clients";

interface UnreadCountProps {
  userId: string;
  initial: number;
}

export function UnreadCount({ userId, initial }: UnreadCountProps) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { count: n, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .is("read_at", null);
      if (!error && n !== null) setCount(n);
    }

    // Unique topic per subscription: in dev, React mounts effects twice, and re-using
    // a topic that is still shutting down makes supabase-js throw.
    const channel = supabase
      .channel(`unread:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        refetch
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        refetch
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (count === 0) return null;

  return (
    <span
      aria-label={`${count} unread messages`}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
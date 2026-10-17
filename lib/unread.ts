import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// cache(): the nav renders this in two places (desktop + mobile), but we query once per request
export const getUnread = cache(
  async (): Promise<{ userId: string; count: number } | null> => {
    const me = await getCurrentProfile();
    if (!me) return null;

    const supabase = await createClient();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", me.id)
      .is("read_at", null);

    return { userId: me.id, count: count ?? 0 };
  }
);
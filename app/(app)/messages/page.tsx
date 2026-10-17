import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { LiveRefresh } from "./live-refresh";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold">Messages</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" aria-hidden />}>
        <Inbox />
      </Suspense>
    </div>
  );
}

async function Inbox() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const [convRes, connRes] = await Promise.all([
    supabase.rpc("my_conversations"),
    supabase
      .from("connections")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
  ]);

  if (convRes.error || connRes.error) {
    return <Card className="text-center font-medium">Couldn&apos;t load messages.</Card>;
  }

  const conversations = convRes.data ?? [];
  const connectedIds = (connRes.data ?? []).map((c) =>
    c.requester_id === me.id ? c.addressee_id : c.requester_id
  );

  // Everyone who has messages with you, plus everyone you're connected to
  const peerIds = [...new Set([...conversations.map((c) => c.peer_id), ...connectedIds])];

  if (peerIds.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-medium">Connect with someone to start chatting.</p>
        <Link href="/find-pair" className={buttonClasses({ size: "sm" })}>
          Find a pair
        </Link>
      </Card>
    );
  }

  const { data: people } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", peerIds);

  const personById = new Map((people ?? []).map((p) => [p.id, p] as const));
  const convById = new Map(conversations.map((c) => [c.peer_id, c] as const));

  // Deactivated users have hidden profiles, so they drop out here
  const rows = peerIds
    .flatMap((id) => {
      const person = personById.get(id);
      return person ? [{ person, conv: convById.get(id) ?? null }] : [];
    })
    .sort((a, b) => {
      const at = a.conv ? Date.parse(a.conv.last_at) : 0;
      const bt = b.conv ? Date.parse(b.conv.last_at) : 0;
      return bt - at || a.person.username.localeCompare(b.person.username);
    });

  return (
    <>
      <LiveRefresh userId={me.id} />
      <Card className="overflow-hidden p-0">
        <ul className="divide-y divide-line">
          {rows.map(({ person, conv }) => {
            const name = person.full_name ?? person.username;
            const unread = conv?.unread_count ?? 0;

            return (
              <li key={person.id}>
                <Link
                  href={`/messages/${person.username}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <Avatar name={name} src={person.avatar_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate", unread > 0 ? "font-semibold" : "font-medium")}>
                        {name}
                      </p>
                      {conv && (
                        <LocalTime
                          iso={conv.last_at}
                          style="short"
                          className="shrink-0 text-xs text-muted-foreground"
                        />
                      )}
                    </div>
                    <p
                      className={cn(
                        "truncate text-sm",
                        unread > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {conv
                        ? `${conv.last_sender_id === me.id ? "You: " : ""}${conv.last_content}`
                        : "No messages yet. Say hi!"}
                    </p>
                  </div>
                  {unread > 0 && <Badge>{unread > 9 ? "9+" : unread}</Badge>}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
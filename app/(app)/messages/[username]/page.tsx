import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { PAGE_SIZE, threadFilter } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "./chat-thread";

type Params = Promise<{ username: string }>;

// Fills the screen below the header. 13rem / 8.5rem = header + page padding (mobile / desktop).
// The skeleton uses the same box, so nothing jumps when the real thread arrives.
const FRAME = "flex h-[calc(100dvh-13rem)] min-h-96 flex-col gap-3 md:h-[calc(100dvh-8.5rem)]";

export default function ThreadPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <Thread params={params} />
    </Suspense>
  );
}

async function Thread({ params }: { params: Params }) {
  const { username } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const { data: other } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("username", username.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (!other) notFound();
  if (other.id === me.id) redirect("/messages");

  const [messagesRes, connectedRes] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .or(threadFilter(me.id, other.id))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1), // one extra row tells us whether older messages exist
    supabase.rpc("are_connected", { a: me.id, b: other.id }),
  ]);

  if (messagesRes.error) {
    return <Card className="text-center font-medium">Couldn&apos;t load this conversation.</Card>;
  }

  const rows = messagesRes.data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const initialMessages = rows.slice(0, PAGE_SIZE).reverse(); // oldest first for display
  const name = other.full_name ?? other.username;

  return (
    <div className={FRAME}>
      <header className="flex shrink-0 items-center gap-3">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar name={name} src={other.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${other.username}`}
            className="block truncate font-display font-semibold hover:underline"
          >
            {name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">@{other.username}</p>
        </div>
      </header>

      <ChatThread
        className="min-h-0 flex-1"
        meId={me.id}
        otherId={other.id}
        otherName={name}
        initialMessages={initialMessages}
        initialHasMore={hasMore}
        canSend={connectedRes.data === true}
      />
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className={FRAME} aria-hidden>
      <div className="h-10 w-56 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
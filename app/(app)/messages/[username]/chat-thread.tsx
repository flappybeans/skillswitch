"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { formatStamp } from "@/lib/format";
import {
  isMessage,
  MESSAGE_MAX,
  PAGE_SIZE,
  threadFilter,
  withMessage,
} from "@/lib/messages";
import { createClient } from "@/lib/supabase/clients";
import type { Message } from "@/lib/types";
import { useIsClient } from "@/lib/use-is-client";
import { sendMessage } from "../actions";

type Item =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; message: Message };

// Insert a "Today / Yesterday / date" label wherever the day changes
function withDayMarkers(messages: Message[]): Item[] {
  const items: Item[] = [];
  let lastDay = "";
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      items.push({ kind: "day", key: day, label: formatStamp(message.created_at, "day") });
      lastDay = day;
    }
    items.push({ kind: "message", message });
  }
  return items;
}

interface ChatThreadProps {
  meId: string;
  otherId: string;
  otherName: string;
  initialMessages: Message[];
  initialHasMore: boolean;
  canSend: boolean;
  className?: string;
}

export function ChatThread({
  meId,
  otherId,
  otherName,
  initialMessages,
  initialHasMore,
  canSend,
  className,
}: ChatThreadProps) {
  // Times and day labels depend on the viewer's timezone, so the list renders client-side only
  const isClient = useIsClient();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true); // is the reader at (or near) the bottom?
  const heightBeforePrepend = useRef<number | null>(null); // set right before adding older messages

  // ----- Realtime + read marking -----
  useEffect(() => {
    const supabase = createClient();

    function markRead() {
      if (document.visibilityState !== "visible") return; // don't mark read in a hidden tab
      void supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", meId)
        .eq("sender_id", otherId)
        .is("read_at", null);
    }

    function onInsert(payload: { new: unknown }) {
      const row = payload.new;
      if (!isMessage(row)) return;

      const inThisThread =
        (row.sender_id === meId && row.receiver_id === otherId) ||
        (row.sender_id === otherId && row.receiver_id === meId);
      if (!inThisThread) return;

      setMessages((prev) => withMessage(prev, row));
      if (row.receiver_id === meId) markRead();
    }

    // Two subscriptions: messages sent TO me (from anyone) and BY me (other tabs/devices).
    // RLS guarantees we only ever receive rows we're allowed to read.
    const channel = supabase
      .channel(`chat:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${meId}` },
        onInsert
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${meId}` },
        onInsert
      )
      .subscribe();

    markRead(); // everything already on screen counts as read
    document.addEventListener("visibilitychange", markRead);

    return () => {
      document.removeEventListener("visibilitychange", markRead);
      void supabase.removeChannel(channel);
    };
  }, [meId, otherId]);

  // ----- Scroll handling -----
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (heightBeforePrepend.current !== null) {
      // Older messages were added above: keep the reader looking at the same message
      el.scrollTop = el.scrollHeight - heightBeforePrepend.current;
      heightBeforePrepend.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isClient]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // ----- Actions -----
  async function send() {
    const content = text.trim();
    if (!content || sending || !canSend) return;

    setSending(true);
    setError(null);
    setText("");
    stickToBottom.current = true;

    const result = await sendMessage(otherId, content);
    if (result.error !== null) {
      setText(content); // give the text back so nothing is lost
      setError(result.error);
    } else {
      const sent = result.message; // const: TS keeps the narrowed type inside the callback
      setMessages((prev) => withMessage(prev, sent));
    }
    setSending(false);
  }

  async function loadEarlier() {
    const oldest = messages[0];
    if (!oldest || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("messages")
      .select("*")
      .or(threadFilter(meId, otherId))
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (loadError || !data) {
      setError("Couldn't load earlier messages.");
    } else {
      const older = data.slice(0, PAGE_SIZE).reverse();
      heightBeforePrepend.current = listRef.current?.scrollHeight ?? null;
      setMessages((prev) => [...older.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
      setHasMore(data.length > PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line (and don't interrupt IME composition)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden p-0", className)}>
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {isClient && hasMore && (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="sm" disabled={loadingMore} onClick={loadEarlier}>
              {loadingMore ? "Loading..." : "Load earlier messages"}
            </Button>
          </div>
        )}

        {isClient && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hi to {otherName}.
          </p>
        )}

        {isClient &&
          withDayMarkers(messages).map((item) =>
            item.kind === "day" ? (
              <p
                key={`day-${item.key}`}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {item.label}
              </p>
            ) : (
              <Bubble
                key={item.message.id}
                message={item.message}
                mine={item.message.sender_id === meId}
              />
            )
          )}
      </div>

      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="shrink-0 space-y-2 border-t border-line p-3"
        >
          {error && (
            <p role="alert" className="text-xs font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MESSAGE_MAX}
              placeholder={`Message ${otherName}`}
              aria-label="Message"
              className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none py-2"
            />
            <Button type="submit" aria-label="Send" disabled={sending || text.trim() === ""}>
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      ) : (
        <p className="shrink-0 border-t border-line p-3 text-center text-sm text-muted-foreground">
          You&apos;re no longer connected with {otherName}, so you can&apos;t send messages.
        </p>
      )}
    </Card>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
          mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
        <p
          className={cn(
            "mt-0.5 text-right text-[11px]",
            mine ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatStamp(message.created_at, "time")}
        </p>
      </div>
    </div>
  );
}
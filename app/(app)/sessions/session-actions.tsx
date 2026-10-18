"use client";

import { Button } from "@/components/ui/buttons";
import type { SessionGroup } from "@/lib/sessions";
import { useAction } from "@/lib/use-action";
import { cancelSession, markSessionDone, respondToSession } from "./actions";

// Every group except history has actions. Exclude<> builds that union for us.
export type SessionActionsMode = Exclude<SessionGroup, "history">;

interface SessionActionsProps {
  sessionId: string;
  mode: SessionActionsMode;
  iAmDone: boolean;
  otherName: string;
}

export function SessionActions({ sessionId, mode, iAmDone, otherName }: SessionActionsProps) {
  const { pending, error, run } = useAction();

  function cancel(label: string, question: string) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (window.confirm(question)) run(() => cancelSession(sessionId));
        }}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {mode === "incoming" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => run(() => respondToSession(sessionId, true))}>
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => respondToSession(sessionId, false))}
            >
              Decline
            </Button>
          </>
        )}

        {mode === "proposed" && cancel("Cancel request", "Cancel this request?")}

        {mode === "upcoming" && cancel("Cancel", "Cancel this session?")}

        {mode === "ready" && (
          <>
            {iAmDone ? (
              <p className="text-sm text-muted-foreground">Waiting for {otherName} to confirm</p>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => run(() => markSessionDone(sessionId))}>
                {pending ? "Confirming..." : "Mark as done"}
              </Button>
            )}
            {cancel("Cancel", "Cancel this session? Nobody will earn points.")}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
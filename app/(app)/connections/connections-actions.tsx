"use client";

import { Button } from "@/components/ui/buttons";
import { useAction } from "@/lib/use-action";
import {
  acceptRequest,
  cancelRequest,
  declineRequest,
  removeConnection,
} from "./actions";

interface ConnectionActionsProps {
  connectionId: string;
  mode: "incoming" | "sent" | "connected";
}

export function ConnectionActions({ connectionId, mode }: ConnectionActionsProps) {
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {mode === "incoming" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => run(() => acceptRequest(connectionId))}>
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => declineRequest(connectionId))}
            >
              Decline
            </Button>
          </>
        )}
        {mode === "sent" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => cancelRequest(connectionId))}
          >
            Cancel request
          </Button>
        )}
        {mode === "connected" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Remove this connection?")) {
                run(() => removeConnection(connectionId));
              }
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

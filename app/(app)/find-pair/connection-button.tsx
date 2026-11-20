"use client";

import { useOptimistic } from "react";
import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/buttons";
import { assertNever } from "@/lib/assert";
import type { Relation } from "@/lib/connections";
import { useAction } from "@/lib/use-action";
import {
  acceptRequest,
  declineRequest,
  sendRequest,
} from "@/app/(app)/connections/actions";

export function ConnectionButton({
  userId,
  username,
  relation,
}: {
  userId: string;
  username: string;
  relation: Relation;
}) {
  const { error, run } = useAction();

  // `relation` is what the server knows. `shown` is what we display: it flips the moment you
  // click, then settles on the real value (or snaps back, if the action failed).
  const [shown, setShown] = useOptimistic(relation);

  function body(): React.ReactNode {
    switch (shown.kind) {
      case "none":
        return (
          <Button
            className="w-full"
            onClick={() =>
              run(
                () => sendRequest(userId),
                () => setShown({ kind: "sent", connectionId: "" })
              )
            }
          >
            Connect
          </Button>
        );
      case "sent":
        return (
          <Button variant="outline" className="w-full" disabled>
            <Clock className="size-4" /> Requested
          </Button>
        );
      case "received": {
        const connectionId = shown.connectionId;
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                run(
                  () => acceptRequest(connectionId),
                  () => setShown({ kind: "connected", connectionId })
                )
              }
            >
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                run(
                  () => declineRequest(connectionId),
                  () => setShown({ kind: "none" })
                )
              }
            >
              Decline
            </Button>
          </div>
        );
      }
      case "connected":
        return (
          <Link
            href={`/messages/${username}`}
            className={buttonClasses({ variant: "outline", className: "w-full" })}
          >
            <MessageCircle className="size-4" /> Message
          </Link>
        );
      default:
        return assertNever(shown);
    }
  }

  return (
    <div className="space-y-2">
      {body()}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
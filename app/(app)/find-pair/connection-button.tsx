"use client";

import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/buttons";
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
  relation,
}: {
  userId: string;
  relation: Relation;
}) {
  const { pending, error, run } = useAction();

  function body(): React.ReactNode {
    switch (relation.kind) {
      case "none":
        return (
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => run(() => sendRequest(userId))}
          >
            {pending ? "Sending..." : "Connect"}
          </Button>
        );
      case "sent":
        return (
          <Button variant="outline" className="w-full" disabled>
            <Clock className="size-4" /> Requested
          </Button>
        );
      case "received":
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={pending}
              onClick={() => run(() => acceptRequest(relation.connectionId))}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={pending}
              onClick={() => run(() => declineRequest(relation.connectionId))}
            >
              Decline
            </Button>
          </div>
        );
      case "connected":
        return (
          <Button variant="outline" className="w-full" disabled>
            <Check className="size-4" /> Connected
          </Button>
        );
      default:
        return assertNever(relation);
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

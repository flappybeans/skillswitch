"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/buttons";
import { useAction } from "@/lib/use-action";
import { actOnFlag } from "./actions";
import { ReasonDialog } from "./reason-dialog";

interface FlagActionsProps {
  flagId: string;
  username: string;
  userActive: boolean;
}

export function FlagActions({ flagId, username, userActive }: FlagActionsProps) {
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/admin/users/${username}`}
          className={buttonClasses({ size: "sm", variant: "outline" })}
        >
          Review points
        </Link>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => actOnFlag(flagId, "dismiss", ""))}
        >
          Dismiss
        </Button>
        {userActive && (
          <ReasonDialog
            trigger="Deactivate"
            variant="danger"
            title="Deactivate this account?"
            description="They'll be signed out and blocked from logging in. This flag will be marked as actioned."
            confirmLabel="Deactivate"
            requireReason
            onConfirm={(reason) => actOnFlag(flagId, "deactivate", reason)}
          />
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
"use client";

import { revertEvent } from "./actions";
import { ReasonDialog } from "./reason-dialog";

export function RevertButton({ eventId }: { eventId: string }) {
  return (
    <ReasonDialog
      trigger="Revert"
      title="Revert these points?"
      description="This adds a negative entry to the ledger that cancels the award. The original entry stays visible, and a revert can't be undone."
      confirmLabel="Revert points"
      onConfirm={(note) => revertEvent(eventId, note)}
    />
  );
}
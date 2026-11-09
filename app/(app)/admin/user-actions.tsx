"use client";

import { setUserActive } from "./actions";
import { ReasonDialog } from "./reason-dialog";

export function UserActions({ userId, active }: { userId: string; active: boolean }) {
  return active ? (
    <ReasonDialog
      trigger="Deactivate"
      variant="danger"
      title="Deactivate this account?"
      description="They'll be signed out and blocked from logging in until you reactivate them. Their data stays."
      confirmLabel="Deactivate"
      requireReason
      onConfirm={(reason) => setUserActive(userId, false, reason)}
    />
  ) : (
    <ReasonDialog
      trigger="Reactivate"
      variant="primary"
      title="Reactivate this account?"
      description="They'll be able to log in again and will show up in the app."
      confirmLabel="Reactivate"
      onConfirm={(reason) => setUserActive(userId, true, reason)}
    />
  );
}
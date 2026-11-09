"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/(app)/connections/actions";
import { Button } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReasonDialogProps {
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<ActionResult>;
}

export function ReasonDialog({
  trigger,
  variant = "outline",
  size = "sm",
  ...form
}: ReasonDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={form.title}>
        <ReasonForm {...form} variant={variant} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

interface ReasonFormProps extends Omit<ReasonDialogProps, "trigger" | "title" | "size"> {
  onDone: () => void;
}

function ReasonForm({
  description,
  confirmLabel,
  variant = "primary",
  requireReason = false,
  onConfirm,
  onDone,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(reason.trim());
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  // A "ghost" or "outline" trigger shouldn't make the CONFIRM button look faint
  const confirmVariant = variant === "danger" ? "danger" : "primary";

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="space-y-1.5">
        <label htmlFor="reason" className="text-sm font-medium">
          {requireReason ? "Reason" : "Note (optional)"}
        </label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Saved in the admin log"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={confirmVariant}
          disabled={pending || (requireReason && reason.trim() === "")}
        >
          {pending ? "Working..." : confirmLabel}
        </Button>
      </div>
    </form>
  );
}
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons";
import { Field } from "@/components/ui/field";
import { requestPasswordReset, type AuthState } from "../actions";

const initialState: AuthState = { error: null, notice: null };

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
          {state.notice}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary-ink underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
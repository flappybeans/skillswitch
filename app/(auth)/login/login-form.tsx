"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons";
import { Field } from "@/components/ui/field";
import { login, type AuthState } from "../actions";

const initialState: AuthState = { error: null, notice: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Logging in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

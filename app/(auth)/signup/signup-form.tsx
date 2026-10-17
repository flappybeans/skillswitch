"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons";
import { Field } from "@/components/ui/field";
import { signup, type AuthState } from "../actions";

const initialState: AuthState = { error: null, notice: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Full name" name="full_name" autoComplete="name" maxLength={80} required />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        minLength={3}
        maxLength={20}
        pattern="[a-zA-Z0-9_]{3,20}"
        hint="3–20 characters: letters, numbers, underscore."
        required
      />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters."
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
      {state.notice && (
        <p className="rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
          {state.notice}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Sign up"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}

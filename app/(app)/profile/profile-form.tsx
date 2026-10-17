"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/buttons";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile, type ProfileState, type ProfileValues } from "./actions";

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const initialState: ProfileState = { error: null, saved: false, values: initial };
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  // React 19 resets a form's fields after its action finishes.
  // Feeding the echoed values back as defaultValue keeps what you typed.
  const v = state.values;

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Full name" name="full_name" defaultValue={v.full_name} maxLength={80} required />

      <Field
        label="Username"
        name="username"
        defaultValue={v.username}
        minLength={3}
        maxLength={20}
        pattern="[a-zA-Z0-9_]{3,20}"
        autoCapitalize="none"
        hint="Letters, numbers, underscore. This is your public @handle."
        required
      />

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={v.bio}
          maxLength={300}
          rows={4}
          placeholder="What can you teach? What do you want to learn?"
        />
        <p className="text-xs text-muted-foreground">Up to 300 characters.</p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
          Saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

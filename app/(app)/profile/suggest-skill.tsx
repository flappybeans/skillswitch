"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/buttons";
import { Input } from "@/components/ui/input";
import { suggestSkill } from "./suggest-actions";

export type Suggestion = { id: string; name: string; status: string };

const LABEL: Record<string, string> = {
  pending: "Waiting",
  approved: "Added",
  rejected: "Not added",
  merged: "Already covered",
};

export function SuggestSkill({ recent }: { recent: Suggestion[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await suggestSkill(name);
      if (result.error) setError(result.error);
      else setName("");
    });
  }

  return (
    <div className="space-y-3 border-t border-line pt-5">
      <div>
        <p className="text-sm font-medium">Can&apos;t find your skill?</p>
        <p className="text-sm text-muted-foreground">Suggest it. An admin reviews every suggestion.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Figma"
          aria-label="Skill name"
        />
        <Button type="submit" disabled={pending || name.trim().length < 2}>
          {pending ? "Sending..." : "Suggest"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {recent.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {recent.map((s) => (
            <li key={s.id}>
              <Badge tone={s.status === "approved" ? "points" : "outline"}>
                {s.name} · {LABEL[s.status] ?? s.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
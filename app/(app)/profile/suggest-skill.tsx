"use client";

import { useOptimistic, useState, useTransition } from "react";
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

interface SuggestSkillProps {
  recent: Suggestion[];
  existing: string[]; // names already in the skill list, for an instant duplicate check
}

export function SuggestSkill({ recent, existing }: SuggestSkillProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // `shown` = the server's list, plus any suggestion still on its way
  const [shown, addShown] = useOptimistic(
    recent,
    (current: Suggestion[], newName: string): Suggestion[] =>
      [{ id: `temp-${newName}`, name: newName, status: "pending" }, ...current].slice(0, 5)
  );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) return;

    // Cheap checks first, so a doomed suggestion never flashes on screen
    if (existing.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      setError("That skill already exists. Look for it in the list.");
      return;
    }

    setError(null);
    setName(""); // clear the box now
    startTransition(async () => {
      addShown(clean); // the chip appears now
      const result = await suggestSkill(clean);
      if (result.error) {
        setError(result.error); // the chip disappears by itself
        setName(clean); // and the text comes back
      }
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
        <Button type="submit" disabled={name.trim().length < 2}>
          Suggest
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {shown.map((s) => (
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
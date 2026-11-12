"use client";

import { useState } from "react";
import { Button } from "@/components/ui/buttons";
import { Select } from "@/components/ui/select";
import { useAction } from "@/lib/use-action";
import { resolveSuggestion } from "./actions";

interface SuggestionActionsProps {
  id: string;
  skills: { id: string; name: string }[];
  defaultTarget: string; // the closest existing skill, or ""
}

export function SuggestionActions({ id, skills, defaultTarget }: SuggestionActionsProps) {
  const { pending, error, run } = useAction();
  const [target, setTarget] = useState(defaultTarget);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => resolveSuggestion(id, "approve", ""))}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => resolveSuggestion(id, "reject", ""))}
        >
          Reject
        </Button>
      </div>
      <div className="flex gap-2">
        <Select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-label="Merge into"
          className="h-8 w-40"
        >
          <option value="">Merge into...</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || target === ""}
          onClick={() => run(() => resolveSuggestion(id, "merge", target))}
        >
          Merge
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
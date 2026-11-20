"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { LocalTime } from "@/components/local-time";
import { useAction } from "@/lib/use-action";
import { resolveSuggestion } from "./actions";

export type Supporter = { id: string; name: string; username: string; createdAt: string };

// Show "10+" instead of an exact number from this many other users up
const COUNT_CAP = 10;

interface SuggestionRowProps {
  id: string;
  name: string;
  supporters: Supporter[]; // oldest first, so the first one suggested it originally
  similar: string[];
  skills: { id: string; name: string }[];
  defaultTarget: string;
}

export function SuggestionRow({ id, name, supporters, similar, skills, defaultTarget }: SuggestionRowProps) {
  const { pending, error, run } = useAction();
  const [hidden, setHidden] = useOptimistic(false);
  const [target, setTarget] = useState(defaultTarget);
  const [open, setOpen] = useState(false);

  const first = supporters.at(0);
  const others = supporters.length - 1;
  const othersLabel = others >= COUNT_CAP ? `${COUNT_CAP}+` : String(others);

  function resolve(action: "approve" | "reject" | "merge") {
    // The row vanishes now. If the server refuses, it comes back with the error under it.
    run(() => resolveSuggestion(id, action, target), () => setHidden(true));
  }

  if (hidden) return null;

  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{name}</p>

        <p className="text-sm text-muted-foreground">
          {first ? (
            <Link href={`/admin/users/${first.username}`} className="font-medium text-foreground hover:underline">
              {first.name}
            </Link>
          ) : (
            "A removed user"
          )}
          {others > 0 && (
            <>
              {" and "}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="font-medium text-primary-ink underline underline-offset-4"
              >
                {othersLabel}
              </button>{" "}
              other {others === 1 ? "user" : "users"}
            </>
          )}{" "}
          suggested this
        </p>

        {similar.length > 0 && (
          <p className="text-sm text-primary-ink">Looks similar to: {similar.join(", ")}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => resolve("approve")}>
            Approve
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => resolve("reject")}>
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
          <Button size="sm" variant="outline" disabled={pending || target === ""} onClick={() => resolve("merge")}>
            Merge
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Who suggested “${name}”`}>
        <p className="mb-3 text-sm text-muted-foreground">
          {supporters.length} {supporters.length === 1 ? "user" : "users"}, oldest first.
        </p>
        <ul className="divide-y divide-line">
          {supporters.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/admin/users/${s.username}`} className="min-w-0 truncate text-sm font-medium hover:underline">
                {s.name} <span className="font-normal text-muted-foreground">@{s.username}</span>
              </Link>
              <LocalTime iso={s.createdAt} style="full" className="shrink-0 text-xs text-muted-foreground" />
            </li>
          ))}
        </ul>
      </Dialog>
    </li>
  );
}
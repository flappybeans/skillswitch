"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { SkillRef } from "@/lib/match";
import {
  formatDuration,
  pointsFor,
  SESSION_DURATIONS,
  WEEKLY_PAIR_CAP,
} from "@/lib/sessions";
import { proposeSession } from "./actions";

export type PeerOption = { id: string; name: string; teach: SkillRef[] };

type Role = "teach" | "learn";

// "2026-10-20T15:00" in the browser's local time, which is what <input type="datetime-local"> expects
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface NewSessionProps {
  peers: PeerOption[];
  myTeach: SkillRef[];
}

export function NewSession({ peers, myTeach }: NewSessionProps) {
  const [open, setOpen] = useState(false);
  const [minStart, setMinStart] = useState("");

  return (
    <>
      <Button
        disabled={peers.length === 0}
        onClick={() => {
          // Reading the clock is impure, so it belongs in an event handler, not in render
          setMinStart(toLocalInput(new Date(Date.now() + 10 * 60_000)));
          setOpen(true);
        }}
      >
        <Plus className="size-4" />
        New session
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Schedule a session">
        <SessionForm
          peers={peers}
          myTeach={myTeach}
          minStart={minStart}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}

interface SessionFormProps extends NewSessionProps {
  minStart: string;
  onDone: () => void;
}

function SessionForm({ peers, myTeach, minStart, onDone }: SessionFormProps) {
  const [peerId, setPeerId] = useState(peers[0]?.id ?? "");
  const [role, setRole] = useState<Role>("teach");
  const [skillChoice, setSkillChoice] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const peer = peers.find((p) => p.id === peerId);
  const peerName = peer?.name ?? "They";
  const skillOptions = role === "teach" ? myTeach : (peer?.teach ?? []);

  // If the options changed (other person or role), fall back to the first skill.
  // This is derived from state, so no effect is needed.
  const skillId = skillOptions.some((s) => s.id === skillChoice)
    ? skillChoice
    : (skillOptions[0]?.id ?? "");

  const points = pointsFor(duration);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const when = new Date(startsAt); // "2026-10-20T15:00" is parsed as LOCAL time
    if (!startsAt || Number.isNaN(when.getTime())) {
      setError("Pick a date and time.");
      return;
    }
    if (!skillId) {
      setError("Pick a skill.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await proposeSession(peerId, role, skillId, when.toISOString(), duration);
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="peer" className="text-sm font-medium">
          With
        </label>
        <Select id="peer" value={peerId} onChange={(e) => setPeerId(e.target.value)}>
          {peers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Who teaches?</p>
        <div className="grid grid-cols-2 gap-2">
          <RoleButton active={role === "teach"} onClick={() => setRole("teach")}>
            I teach
          </RoleButton>
          <RoleButton active={role === "learn"} onClick={() => setRole("learn")}>
            {peerName} teaches
          </RoleButton>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="skill" className="text-sm font-medium">
          Skill
        </label>
        {skillOptions.length > 0 ? (
          <Select id="skill" value={skillId} onChange={(e) => setSkillChoice(e.target.value)}>
            {skillOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            {role === "teach" ? (
              <>
                You haven&apos;t picked any skills to teach yet.{" "}
                <Link href="/profile" className="font-medium text-primary-ink underline underline-offset-4">
                  Add some on your profile
                </Link>
                .
              </>
            ) : (
              `${peerName} hasn't listed any skills to teach yet.`
            )}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="starts" className="text-sm font-medium">
          Starts
        </label>
        <Input
          id="starts"
          type="datetime-local"
          value={startsAt}
          min={minStart}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="duration" className="text-sm font-medium">
          Duration
        </label>
        <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {SESSION_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {formatDuration(m)}
            </option>
          ))}
        </Select>
      </div>

      <p className="rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm text-accent-foreground">
        Tutor earns <strong>{points.tutor} pts</strong>, learner earns{" "}
        <strong>{points.student} pts</strong>, once you both confirm the session is done. Each pair
        can earn from {WEEKLY_PAIR_CAP} sessions per week.
      </p>

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
        <Button type="submit" disabled={pending || skillOptions.length === 0}>
          {pending ? "Sending..." : "Send request"}
        </Button>
      </div>
    </form>
  );
}

function RoleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "truncate rounded-md border px-3 py-2 text-sm font-medium transition-colors",
        active ? "border-transparent bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
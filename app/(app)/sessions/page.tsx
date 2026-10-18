import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { getCurrentProfile } from "@/lib/auth";
import type { SkillRef } from "@/lib/match";
import {
  displayStatus,
  endsAtMs,
  formatDuration,
  groupOf,
  STATUS_LABEL,
  type SessionGroup,
} from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/types";
import { NewSession, type PeerOption } from "./new-session";
import { SessionActions } from "./session-actions";

type Pal = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};
type Entry = { session: Session; other: Pal };
type Earned = { points: number; capped: boolean };

const SECTIONS: { group: SessionGroup; title: string }[] = [
  { group: "incoming", title: "Needs your answer" },
  { group: "ready", title: "Ready to confirm" },
  { group: "upcoming", title: "Upcoming" },
  { group: "proposed", title: "Waiting for a reply" },
  { group: "history", title: "History" },
];

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-semibold">Sessions</h1>
        <p className="text-muted-foreground">
          Schedule a swap. Points are awarded once you both confirm it&apos;s done.
        </p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" aria-hidden />}>
        <SessionsBoard />
      </Suspense>
    </div>
  );
}

async function SessionsBoard() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const [sessionsRes, connRes, skillsRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .or(`tutor_id.eq.${me.id},student_id.eq.${me.id}`)
      .order("scheduled_at", { ascending: false })
      .limit(100),
    supabase
      .from("connections")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
    supabase.from("skills").select("id, name"),
  ]);

  if (sessionsRes.error || connRes.error || skillsRes.error) {
    return <Card className="text-center font-medium">Couldn&apos;t load sessions.</Card>;
  }

  const sessions = sessionsRes.data ?? [];
  const otherOf = (s: Session) => (s.tutor_id === me.id ? s.student_id : s.tutor_id);
  const connectedIds = (connRes.data ?? []).map((c) =>
    c.requester_id === me.id ? c.addressee_id : c.requester_id
  );
  const peerIds = [...new Set([...connectedIds, ...sessions.map(otherOf)])];
  const completedIds = sessions.filter((s) => s.status === "completed").map((s) => s.id);

  const [peopleRes, teachRes, eventsRes] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", peerIds),
    supabase
      .from("user_skills")
      .select("user_id, skill_id")
      .eq("kind", "teach")
      .in("user_id", [...peerIds, me.id]),
    // RLS only lets you read your OWN ledger rows
    supabase
      .from("point_events")
      .select("session_id, delta, reason")
      .eq("user_id", me.id)
      .in("session_id", completedIds),
  ]);

  const skillName = new Map((skillsRes.data ?? []).map((s) => [s.id, s.name] as const));
  const personById = new Map((peopleRes.data ?? []).map((p) => [p.id, p] as const));

  const teachByUser = new Map<string, SkillRef[]>();
  for (const row of teachRes.data ?? []) {
    const name = skillName.get(row.skill_id);
    if (!name) continue;
    const list = teachByUser.get(row.user_id) ?? [];
    list.push({ id: row.skill_id, name });
    teachByUser.set(row.user_id, list);
  }

  const peers: PeerOption[] = connectedIds.flatMap((id) => {
    const p = personById.get(id);
    return p ? [{ id, name: p.full_name ?? p.username, teach: teachByUser.get(id) ?? [] }] : [];
  });
  const myTeach = teachByUser.get(me.id) ?? [];

  const earned = new Map<string, Earned>();
  for (const e of eventsRes.data ?? []) {
    if (!e.session_id) continue;
    const prev = earned.get(e.session_id);
    earned.set(e.session_id, {
      points: (prev?.points ?? 0) + e.delta,
      capped: (prev?.capped ?? false) || e.reason === "weekly_pair_cap",
    });
  }

  // Sort sessions into sections. Sessions with a hidden (deactivated) person are skipped.
  const nowMs = Date.now();
  const groups: Record<SessionGroup, Entry[]> = {
    incoming: [],
    proposed: [],
    ready: [],
    upcoming: [],
    history: [],
  };
  for (const session of sessions) {
    const other = personById.get(otherOf(session));
    if (other) groups[groupOf(session, me.id, nowMs)].push({ session, other });
  }
  // Query was newest-first. Open sections read better soonest-first.
  for (const g of ["incoming", "proposed", "ready", "upcoming"] as const) groups[g].reverse();
  groups.history = groups.history.slice(0, 20);

  const isEmpty = SECTIONS.every(({ group }) => groups[group].length === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <NewSession peers={peers} myTeach={myTeach} />
      </div>

      {isEmpty && (
        <Card className="space-y-3 text-center">
          {peers.length === 0 ? (
            <>
              <p className="font-medium">Connect with someone first, then schedule a session.</p>
              <Link href="/find-pair" className={buttonClasses({ size: "sm" })}>
                Find a pair
              </Link>
            </>
          ) : (
            <p className="font-medium">No sessions yet. Hit “New session” to schedule your first swap.</p>
          )}
        </Card>
      )}

      {SECTIONS.map(({ group, title }) => {
        const list = groups[group];
        if (list.length === 0) return null;

        return (
          <Card key={group} className="space-y-2">
            <h2 className="text-xl font-semibold">
              {title} <span className="text-muted-foreground">({list.length})</span>
            </h2>
            <ul className="divide-y divide-line">
              {list.map(({ session, other }) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  meId={me.id}
                  other={other}
                  skill={skillName.get(session.skill_id) ?? "Skill"}
                  group={group}
                  earned={earned.get(session.id)}
                  nowMs={nowMs}
                />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

interface RowProps {
  session: Session;
  meId: string;
  other: Pal;
  skill: string;
  group: SessionGroup;
  earned: Earned | undefined;
  nowMs: number;
}

function SessionRow({ session: s, meId, other, skill, group, earned, nowMs }: RowProps) {
  const name = other.full_name ?? other.username;
  const iTeach = s.tutor_id === meId;
  const iAmDone = iTeach ? s.tutor_done : s.student_done;
  const status = displayStatus(s, nowMs);
  const endsIso = new Date(endsAtMs(s)).toISOString();

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={name} src={other.avatar_url} size={44} />

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium">
          {skill} <span className="text-muted-foreground">with {name}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {iTeach ? "You teach" : `${name} teaches`} · <LocalTime iso={s.scheduled_at} style="full" /> ·{" "}
          {formatDuration(s.duration_min)}
        </p>
        {group === "upcoming" && (
          <p className="text-xs text-muted-foreground">
            You can confirm after it ends (<LocalTime iso={endsIso} style="full" />).
          </p>
        )}
      </div>

      {group === "history" ? (
        status === "completed" && earned ? (
          earned.capped ? (
            <Badge tone="outline">Weekly limit reached</Badge>
          ) : (
            <Badge tone="points">+{earned.points} pts</Badge>
          )
        ) : (
          <Badge tone="outline">{STATUS_LABEL[status]}</Badge>
        )
      ) : (
        <SessionActions sessionId={s.id} mode={group} iAmDone={iAmDone} otherName={name} />
      )}
    </li>
  );
}
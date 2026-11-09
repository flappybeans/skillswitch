import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { firstString } from "@/lib/form";
import {
  LEADERBOARD_SIZE,
  parsePeriod,
  PERIOD_LABEL,
  PERIODS,
  type Period,
} from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

type Pal = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};
type Entry = { pos: number; place: number; points: number; userId: string; person: Pal };

export default function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-semibold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Points come from sessions that both people confirmed.
        </p>
      </div>
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const period = parsePeriod(firstString((await searchParams).period));

  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("leaderboard", {
    p_period: period,
    p_limit: LEADERBOARD_SIZE,
  });

  if (error || !rows) {
    return <Card className="text-center font-medium">Couldn&apos;t load the leaderboard.</Card>;
  }

  const { data: people } =
    rows.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", rows.map((r) => r.user_id))
      : { data: [] as Pal[] };

  const byId = new Map((people ?? []).map((p) => [p.id, p] as const));

  const entries: Entry[] = rows.flatMap((r) => {
    const person = byId.get(r.user_id);
    return person
      ? [{ pos: r.pos, place: r.place, points: r.points, userId: r.user_id, person }]
      : [];
  });

  const top = entries.filter((e) => e.pos <= LEADERBOARD_SIZE);
  const mine = entries.find((e) => e.userId === me.id);
  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="space-y-6">
      <PeriodTabs period={period} />

      <Card className="flex items-center justify-between gap-4">
        {mine ? (
          <>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Your rank · {PERIOD_LABEL[period]}
              </p>
              <p className="font-display text-4xl font-semibold text-primary-ink">
                #{mine.place}
              </p>
            </div>
            <Badge tone="points">{mine.points} pts</Badge>
          </>
        ) : (
          <>
            <div>
              <p className="font-medium">
                You&apos;re not ranked {period === "week" ? "this week" : "yet"}.
              </p>
              <p className="text-sm text-muted-foreground">
                Complete a session that you both confirm to earn points.
              </p>
            </div>
            <Link href="/sessions" className={buttonClasses({ size: "sm" })}>
              Schedule one
            </Link>
          </>
        )}
      </Card>

      {top.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">
            Nobody has points {period === "week" ? "this week" : "yet"}. Be the first.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {podium.map((entry) => (
              <PodiumCard key={entry.userId} entry={entry} isMe={entry.userId === me.id} />
            ))}
          </div>

          {rest.length > 0 && (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-line">
                {rest.map((entry) => (
                  <RankRow key={entry.userId} entry={entry} isMe={entry.userId === me.id} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Ties share a rank. The weekly board covers the last 7 days and includes any admin
        corrections.
      </p>
    </div>
  );
}

function PeriodTabs({ period }: { period: Period }) {
  return (
    <nav
      aria-label="Leaderboard period"
      className="inline-flex gap-1 rounded-md border border-line bg-card p-1"
    >
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={p === "all" ? "/leaderboard" : `/leaderboard?period=${p}`}
          aria-current={p === period ? "page" : undefined}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            p === period
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {PERIOD_LABEL[p]}
        </Link>
      ))}
    </nav>
  );
}

function PodiumCard({ entry, isMe }: { entry: Entry; isMe: boolean }) {
  const name = entry.person.full_name ?? entry.person.username;
  const first = entry.place === 1;

  return (
    <Card
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        first && "bg-accent text-accent-foreground",
        isMe && "border-primary"
      )}
    >
      <span className="font-display text-3xl font-semibold">#{entry.place}</span>
      <Avatar name={name} src={entry.person.avatar_url} size={64} />
      <div className="w-full min-w-0">
        <Link
          href={`/u/${entry.person.username}`}
          className="block truncate font-display font-semibold hover:underline"
        >
          {name}
        </Link>
        <p className="truncate text-sm opacity-70">@{entry.person.username}</p>
      </div>
      <Badge tone={first ? "default" : "points"}>{entry.points} pts</Badge>
    </Card>
  );
}

function RankRow({ entry, isMe }: { entry: Entry; isMe: boolean }) {
  const name = entry.person.full_name ?? entry.person.username;

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", isMe && "bg-accent")}>
      <span className="w-8 shrink-0 text-center font-display font-semibold text-muted-foreground">
        {entry.place}
      </span>
      <Avatar name={name} src={entry.person.avatar_url} size={40} />
      <Link
        href={`/u/${entry.person.username}`}
        className="min-w-0 flex-1 truncate font-medium hover:underline"
      >
        {name}
        {isMe && <span className="text-muted-foreground"> (you)</span>}
      </Link>
      <Badge tone={isMe ? "outline" : "points"}>{entry.points} pts</Badge>
    </li>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
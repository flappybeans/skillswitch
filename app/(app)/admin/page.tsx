import { Suspense } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { requireAdmin } from "@/lib/admin";
import { actionLabel } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { ScanButton } from "./scan-button";

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdmin();

  const supabase = await createClient();
  const [statsRes, actionsRes] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase
      .from("admin_actions")
      .select("id, admin_id, action, target_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const stats = statsRes.data?.[0];
  if (statsRes.error || !stats) {
    return <Card className="text-center font-medium">Couldn&apos;t load the overview.</Card>;
  }

  const actions = actionsRes.data ?? [];
  const ids = [
    ...new Set(
      actions.flatMap((a) => [a.admin_id, a.target_user_id].filter((id): id is string => id !== null))
    ),
  ];
  const { data: people } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, username, full_name").in("id", ids)
      : { data: [] };
  const nameOf = new Map(
    (people ?? []).map((p) => [p.id, { name: p.full_name ?? p.username, username: p.username }] as const)
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={stats.users} hint={`${stats.active_users} active`} href="/admin/users" />
        <Stat label="Open flags" value={stats.open_flags} hint="Waiting for review" href="/admin/flags" />
        <Stat label="Sessions completed" value={stats.sessions_7d} hint="Last 7 days" />
        <Stat label="Points awarded" value={stats.points_7d} hint="Last 7 days" />
      </div>

      <Card className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Fraud scan</h2>
          <p className="text-sm text-muted-foreground">
            Looks for repeated pairings, reciprocal swapping, session bursts, point spikes, and new
            accounts that only earn from one partner. Re-running it never creates duplicates.
          </p>
        </div>
        <ScanButton />
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Recent admin activity</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {actions.map((a) => {
              const admin = a.admin_id ? nameOf.get(a.admin_id) : undefined;
              const target = a.target_user_id ? nameOf.get(a.target_user_id) : undefined;
              return (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                  <p>
                    <span className="font-medium">{admin?.name ?? "An admin"}</span>{" "}
                    {actionLabel(a.action).toLowerCase()}{" "}
                    {target ? (
                      <Link href={`/admin/users/${target.username}`} className="font-medium hover:underline">
                        {target.name}
                      </Link>
                    ) : (
                      "a removed user"
                    )}
                  </p>
                  <LocalTime iso={a.created_at} style="full" className="text-xs text-muted-foreground" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href?: string;
}) {
  const body = (
    <Card className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}
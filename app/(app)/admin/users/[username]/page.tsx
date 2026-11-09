import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { requireAdmin } from "@/lib/admin";
import {
  actionLabel,
  asDetails,
  describeFlag,
  eventLabel,
  flagTitle,
  partnerOf,
} from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { RevertButton } from "../../revert-button";
import { UserActions } from "../../user-actions";

type Params = Promise<{ username: string }>;

export default function AdminUserPage({ params }: { params: Params }) {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All users
      </Link>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" aria-hidden />}>
        <UserDetail params={params} />
      </Suspense>
    </div>
  );
}

async function UserDetail({ params }: { params: Params }) {
  const admin = await requireAdmin();
  const { username } = await params;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, avatar_url, role, is_active, points, created_at")
    .eq("username", username.toLowerCase())
    .maybeSingle(); // admins can see deactivated users too (the Phase 5 policy)

  if (!user) notFound();

  const [eventsRes, flagsRes, actionsRes] = await Promise.all([
    supabase
      .from("point_events")
      .select("id, delta, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("flags")
      .select("id, type, details, status, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("admin_actions")
      .select("id, admin_id, action, details, created_at")
      .eq("target_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const events = eventsRes.data ?? [];
  const flags = flagsRes.data ?? [];
  const actions = actionsRes.data ?? [];

  // One query for every name we need on this page (partners in flags, admins in the log)
  const partnerIds = flags.flatMap((f) => {
    const id = partnerOf(asDetails(f.details));
    return id ? [id] : [];
  });
  const adminIds = actions.flatMap((a) => (a.admin_id ? [a.admin_id] : []));
  const lookup = [...new Set([...partnerIds, ...adminIds])];
  const { data: people } =
    lookup.length > 0
      ? await supabase.from("profiles").select("id, username, full_name").in("id", lookup)
      : { data: [] };
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name ?? p.username] as const));

  // Which awards have already been reverted? A revert row's reason is "revert:<original id>".
  const revertedIds = new Set(
    events.filter((e) => e.reason.startsWith("revert:")).map((e) => e.reason.slice("revert:".length))
  );

  const name = user.full_name ?? user.username;
  const isAdminOrSelf = user.role === "admin" || user.id === admin.id;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={name} src={user.avatar_url} size={88} />
        <div className="flex-1 space-y-2">
          <div>
            <h2 className="text-2xl font-semibold">{name}</h2>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="points">{user.points} pts</Badge>
            {user.role === "admin" && <Badge>Admin</Badge>}
            {!user.is_active && (
              <Badge tone="outline" className="text-danger">
                Deactivated
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Joined <LocalTime iso={user.created_at} style="full" />
            </span>
          </div>
          <p className={user.bio ? "text-sm" : "text-sm text-muted-foreground"}>
            {user.bio || "No bio."}
          </p>
          {user.is_active && (
            <Link href={`/u/${user.username}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
              View public profile
            </Link>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {isAdminOrSelf ? (
            <p className="max-w-48 text-sm text-muted-foreground sm:text-right">
              Admin accounts can&apos;t be deactivated from here.
            </p>
          ) : (
            <UserActions userId={user.id} active={user.is_active} />
          )}
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Points history</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No point events yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e) => {
              const isAward = e.delta > 0 && !e.reason.startsWith("revert:");
              const reverted = revertedIds.has(e.id);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{eventLabel(e.reason)}</p>
                    <LocalTime iso={e.created_at} style="full" className="text-sm text-muted-foreground" />
                  </div>
                  <Badge tone={e.delta > 0 ? "points" : "outline"}>
                    {e.delta > 0 ? "+" : ""}
                    {e.delta} pts
                  </Badge>
                  {reverted && <Badge tone="outline">Reverted</Badge>}
                  {isAward && !reverted && <RevertButton eventId={e.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Flags</h2>
        {flags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flags for this user.</p>
        ) : (
          <ul className="divide-y divide-line">
            {flags.map((f) => {
              const d = asDetails(f.details);
              const partnerId = partnerOf(d);
              return (
                <li key={f.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{flagTitle(f.type)}</Badge>
                    <Badge tone={f.status === "open" ? "default" : "outline"}>{f.status}</Badge>
                  </div>
                  <p className="text-sm">
                    {describeFlag(f.type, d, partnerId ? (nameOf.get(partnerId) ?? null) : null)}
                  </p>
                  {f.note && <p className="text-xs text-muted-foreground">Note: {f.note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Admin history</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin actions on this account.</p>
        ) : (
          <ul className="divide-y divide-line">
            {actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                <p>
                  <span className="font-medium">
                    {a.admin_id ? (nameOf.get(a.admin_id) ?? "An admin") : "An admin"}
                  </span>{" "}
                  {actionLabel(a.action).toLowerCase()} this account
                </p>
                <LocalTime iso={a.created_at} style="full" className="text-xs text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
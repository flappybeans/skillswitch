import { Suspense } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { requireAdmin } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { asDetails, describeFlag, flagTitle, partnerOf } from "@/lib/flags";
import { firstString } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { FlagActions } from "../flag-actions";

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES = ["open", "dismissed", "actioned"] as const;
type FlagStatus = (typeof STATUSES)[number];
const STATUS_LABEL: Record<FlagStatus, string> = {
  open: "Open",
  dismissed: "Dismissed",
  actioned: "Actioned",
};

type Pal = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  points: number;
};

export default function AdminFlagsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />}>
      <Flags searchParams={searchParams} />
    </Suspense>
  );
}

async function Flags({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();

  const raw = firstString((await searchParams).status);
  const status: FlagStatus = STATUSES.find((s) => s === raw) ?? "open";

  const supabase = await createClient();
  const { data: flags, error } = await supabase
    .from("flags")
    .select("id, user_id, type, details, status, note, created_at, resolved_by")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !flags) {
    return <Card className="text-center font-medium">Couldn&apos;t load flags.</Card>;
  }

  const partnerIds = flags.flatMap((f) => {
    const id = partnerOf(asDetails(f.details));
    return id ? [id] : [];
  });
  const resolverIds = flags.flatMap((f) => (f.resolved_by ? [f.resolved_by] : []));
  const ids = [...new Set([...flags.map((f) => f.user_id), ...partnerIds, ...resolverIds])];

  const { data: people } =
    ids.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_active, points")
          .in("id", ids)
      : { data: [] as Pal[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p] as const));
  const display = (id: string | null): string | null => {
    const p = id ? byId.get(id) : undefined;
    return p ? (p.full_name ?? p.username) : null;
  };

  return (
    <div className="space-y-4">
      <nav aria-label="Flag status" className="inline-flex gap-1 rounded-md border border-line bg-card p-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "open" ? "/admin/flags" : `/admin/flags?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              s === status
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {flags.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">
            {status === "open" ? "Nothing to review. Run a scan from the Overview." : "Nothing here."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {flags.map((f) => {
              const user = byId.get(f.user_id);
              if (!user) return null;
              const d = asDetails(f.details);
              const name = user.full_name ?? user.username;
              const resolver = display(f.resolved_by);

              return (
                <li key={f.id} className="flex flex-wrap items-start gap-3 px-4 py-4">
                  <Avatar name={name} src={user.avatar_url} size={44} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/users/${user.username}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                      <Badge tone="outline">{flagTitle(f.type)}</Badge>
                      {!user.is_active && (
                        <Badge tone="outline" className="text-danger">
                          Deactivated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{describeFlag(f.type, d, display(partnerOf(d)))}</p>
                    <p className="text-xs text-muted-foreground">
                      <LocalTime iso={f.created_at} style="full" /> · {user.points} pts total
                    </p>
                    {f.status !== "open" && (
                      <p className="text-xs text-muted-foreground">
                        {STATUS_LABEL[f.status === "dismissed" ? "dismissed" : "actioned"]}
                        {resolver && ` by ${resolver}`}
                        {f.note && ` · ${f.note}`}
                      </p>
                    )}
                  </div>
                  {f.status === "open" && (
                    <FlagActions flagId={f.id} username={user.username} userActive={user.is_active} />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
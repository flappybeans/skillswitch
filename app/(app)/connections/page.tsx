import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConnectionActions } from "./connections-actions";

type Pal = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold">Connections</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" aria-hidden />}>
        <ConnectionLists />
      </Suspense>
    </div>
  );
}

async function ConnectionLists() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return <Card className="text-center font-medium">Couldn&apos;t load connections.</Card>;
  }

  if (rows.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-medium">No connections yet.</p>
        <Link href="/find-pair" className={buttonClasses({ size: "sm" })}>
          Find a pair
        </Link>
      </Card>
    );
  }

  const otherIdOf = (row: (typeof rows)[number]) =>
    row.requester_id === me.id ? row.addressee_id : row.requester_id;

  const { data: people } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", rows.map(otherIdOf));

  const byId = new Map((people ?? []).map((p) => [p.id, p] as const));

  // Pair each row with the other person's profile. Rows whose profile is hidden
  // (deactivated users) are skipped.
  const withPeople = (list: typeof rows) =>
    list.flatMap((row) => {
      const other = byId.get(otherIdOf(row));
      return other ? [{ row, other }] : [];
    });

  const incoming = withPeople(rows.filter((r) => r.status === "pending" && r.addressee_id === me.id));
  const sent = withPeople(rows.filter((r) => r.status === "pending" && r.requester_id === me.id));
  const connected = withPeople(rows.filter((r) => r.status === "accepted"));

  return (
    <div className="space-y-6">
      <Section title="Requests for you" count={incoming.length} empty="No pending requests.">
        {incoming.map(({ row, other }) => (
          <PersonRow key={row.id} person={other}>
            <ConnectionActions connectionId={row.id} mode="incoming" />
          </PersonRow>
        ))}
      </Section>

      <Section title="Connected" count={connected.length} empty="Nobody yet. Accept a request or send one.">
        {connected.map(({ row, other }) => (
          <PersonRow key={row.id} person={other}>
            <ConnectionActions connectionId={row.id} mode="connected" username={other.username} />
          </PersonRow>
        ))}
      </Section>

      <Section title="Sent requests" count={sent.length} empty="No requests waiting on others.">
        {sent.map(({ row, other }) => (
          <PersonRow key={row.id} person={other}>
            <ConnectionActions connectionId={row.id} mode="sent" />
          </PersonRow>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-2">
      <h2 className="text-xl font-semibold">
        {title} <span className="text-muted-foreground">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">{children}</ul>
      )}
    </Card>
  );
}

function PersonRow({
  person,
  children,
}: {
  person: Pal;
  children: React.ReactNode;
}) {
  const name = person.full_name ?? person.username;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={name} src={person.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${person.username}`}
          className="block truncate font-medium hover:underline"
        >
          {name}
        </Link>
        <p className="truncate text-sm text-muted-foreground">@{person.username}</p>
      </div>
      {children}
    </li>
  );
}

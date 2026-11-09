import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/lib/admin";
import { cleanSearch, firstString } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();

  const params = await searchParams;
  const q = cleanSearch(firstString(params.q));
  const onlyInactive = firstString(params.status) === "inactive";

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role, is_active, points, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  if (onlyInactive) query = query.eq("is_active", false);

  const { data: users, error } = await query;
  if (error || !users) {
    return <Card className="text-center font-medium">Couldn&apos;t load users.</Card>;
  }

  const hasFilters = q !== "" || onlyInactive;

  return (
    <div className="space-y-4">
      <Form
        key={`${q}|${onlyInactive}`}
        action="/admin/users"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Input name="q" defaultValue={q} maxLength={50} placeholder="Search name or @username..." aria-label="Search" />
        <Select
          name="status"
          defaultValue={onlyInactive ? "inactive" : ""}
          aria-label="Filter by status"
          className="sm:max-w-48"
        >
          <option value="">All accounts</option>
          <option value="inactive">Deactivated only</option>
        </Select>
        <Button type="submit">Search</Button>
        {hasFilters && (
          <Link href="/admin/users" className={buttonClasses({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </Form>

      <p className="text-sm text-muted-foreground">
        {users.length} user{users.length === 1 ? "" : "s"}
        {users.length === 50 && " (showing the newest 50, so narrow your search)"}
      </p>

      {users.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">No users match.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const name = u.full_name ?? u.username;
              return (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/${u.username}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <Avatar name={name} src={u.avatar_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      <p className="truncate text-sm text-muted-foreground">@{u.username}</p>
                    </div>
                    {u.role === "admin" && <Badge>Admin</Badge>}
                    {!u.is_active && (
                      <Badge tone="outline" className="text-danger">
                        Deactivated
                      </Badge>
                    )}
                    <Badge tone="points">{u.points} pts</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
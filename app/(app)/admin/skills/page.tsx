import { Suspense } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { SuggestionActions } from "../suggestion-actions";

export default function AdminSkillsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />}>
      <Suggestions />
    </Suspense>
  );
}

async function Suggestions() {
  await requireAdmin();

  const supabase = await createClient();
  const [pendingRes, skillsRes] = await Promise.all([
    supabase
      .from("skill_suggestions")
      .select("id, user_id, name, created_at")
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
    supabase.from("skills").select("id, name").order("name"),
  ]);

  if (pendingRes.error || skillsRes.error) {
    return <Card className="text-center font-medium">Couldn&apos;t load suggestions.</Card>;
  }

  const pending = pendingRes.data ?? [];
  const skills = skillsRes.data ?? [];

  const userIds = [...new Set(pending.map((s) => s.user_id))];
  const { data: people } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, username, full_name").in("id", userIds)
      : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p] as const));

  if (pending.length === 0) {
    return (
      <Card className="text-center">
        <p className="font-medium">No suggestions waiting. The current list has {skills.length} skills.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {pending.map((s) => {
          const user = byId.get(s.user_id);
          const lower = s.name.toLowerCase();
          // "JS" vs "JavaScript": existing skills whose name contains, or is contained in, the suggestion
          const similar = skills.filter((k) => {
            const n = k.name.toLowerCase();
            return n.includes(lower) || lower.includes(n);
          });

          return (
            <li key={s.id} className="flex flex-wrap items-start gap-3 px-4 py-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user ? (
                    <Link href={`/admin/users/${user.username}`} className="hover:underline">
                      {user.full_name ?? user.username}
                    </Link>
                  ) : (
                    "Removed user"
                  )}{" "}
                  · <LocalTime iso={s.created_at} style="full" />
                </p>
                {similar.length > 0 && (
                  <p className="text-sm text-primary-ink">
                    Looks similar to: {similar.map((k) => k.name).join(", ")}
                  </p>
                )}
              </div>
              <SuggestionActions id={s.id} skills={skills} defaultTarget={similar[0]?.id ?? ""} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
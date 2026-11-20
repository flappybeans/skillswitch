import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { SuggestionRow, type Supporter } from "../suggestion-row";

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
      .select("id, name, created_at")
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

  if (pending.length === 0) {
    return (
      <Card className="text-center">
        <p className="font-medium">No suggestions waiting. The current list has {skills.length} skills.</p>
      </Card>
    );
  }

  const { data: supporterRows } = await supabase
    .from("skill_suggestion_supporters")
    .select("suggestion_id, user_id, created_at")
    .in("suggestion_id", pending.map((s) => s.id))
    .order("created_at");
  const rows = supporterRows ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: people } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, username, full_name").in("id", userIds)
      : { data: [] };
  const personById = new Map((people ?? []).map((p) => [p.id, p] as const));

  const supportersOf = new Map<string, Supporter[]>();
  for (const r of rows) {
    const p = personById.get(r.user_id);
    if (!p) continue;
    const list = supportersOf.get(r.suggestion_id) ?? [];
    list.push({ id: p.id, name: p.full_name ?? p.username, username: p.username, createdAt: r.created_at });
    supportersOf.set(r.suggestion_id, list);
  }

  // Most-wanted first. The query was oldest-first, and sort() is stable, so ties stay oldest-first.
  const sorted = [...pending].sort(
    (a, b) => (supportersOf.get(b.id)?.length ?? 0) - (supportersOf.get(a.id)?.length ?? 0)
  );

  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {sorted.map((s) => {
          const lower = s.name.toLowerCase();
          // "JS" vs "JavaScript": existing skills whose name contains, or is contained in, the suggestion
          const similar = skills.filter((k) => {
            const n = k.name.toLowerCase();
            return n.includes(lower) || lower.includes(n);
          });

          return (
            <SuggestionRow
              key={s.id}
              id={s.id}
              name={s.name}
              supporters={supportersOf.get(s.id) ?? []}
              similar={similar.map((k) => k.name)}
              skills={skills}
              defaultTarget={similar[0]?.id ?? ""}
            />
          );
        })}
      </ul>
    </Card>
  );
}
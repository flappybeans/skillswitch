import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getCurrentProfile } from "@/lib/auth";
import { buildRelations, type Relation } from "@/lib/connections";
import { firstString, isUuid } from "@/lib/form";
import { buildPerson, computeMatch } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import { StudentCard, type Candidate } from "./student-card";

type SearchParams = Record<string, string | string[] | undefined>;

const NONE: Relation = { kind: "none" };

export default function FindPairPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-4xl font-extrabold">Find Pair</h1>
          <p className="text-muted-foreground">
            Students who can teach what you want to learn.
          </p>
        </div>
        <Suspense fallback={<ConnectionsLinkView count={0} />}>
          <ConnectionsLink />
        </Suspense>
      </div>

      <Suspense fallback={<BrowserSkeleton />}>
        <Browser searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ConnectionsLink() {
  const me = await getCurrentProfile();
  let pendingCount = 0;

  if (me) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", me.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return <ConnectionsLinkView count={pendingCount} />;
}

function ConnectionsLinkView({ count }: { count: number }) {
  return (
    <Link href="/connections" className={buttonClasses({ variant: "outline" })}>
      <Users className="size-4" />
      Connections
      {count > 0 && <Badge tone="points">{count}</Badge>}
    </Link>
  );
}

async function Browser({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = firstString(params.q).trim().slice(0, 50).toLowerCase();
  const rawSkill = firstString(params.skill);
  const skillId = isUuid(rawSkill) ? rawSkill : "";

  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = await createClient();
  const [skillsRes, profilesRes, connectionsRes, mineRes] = await Promise.all([
    supabase.from("skills").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url, points, user_skills(skill_id, kind)")
      .eq("is_active", true)
      .neq("id", me.id)
      .order("points", { ascending: false })
      .limit(200),
    supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
    supabase.from("user_skills").select("skill_id, kind").eq("user_id", me.id),
  ]);

  if (skillsRes.error || profilesRes.error || connectionsRes.error || mineRes.error) {
    return (
      <Card className="text-center font-semibold">
        Couldn&apos;t load students. Refresh to try again.
      </Card>
    );
  }

  const skills = skillsRes.data ?? [];
  const skillById = new Map(skills.map((s) => [s.id, s] as const));
  const mePerson = buildPerson(mineRes.data ?? [], skillById);
  const relations = buildRelations(me.id, connectionsRes.data ?? []);

  const candidates: Candidate[] = (profilesRes.data ?? []).map((p) => {
    const person = buildPerson(p.user_skills, skillById);
    return {
      id: p.id,
      username: p.username,
      fullName: p.full_name,
      bio: p.bio,
      avatarUrl: p.avatar_url,
      points: p.points,
      person,
      match: computeMatch(mePerson, person),
      relation: relations.get(p.id) ?? NONE,
    };
  });

  const results = candidates
    .filter((c) => {
      if (skillId && !c.person.teach.some((s) => s.id === skillId)) return false;
      if (q) {
        const haystack = [
          c.username,
          c.fullName ?? "",
          ...c.person.teach.map((s) => s.name),
          ...c.person.learn.map((s) => s.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.match.score - a.match.score || b.points - a.points);

  const hasFilters = q !== "" || skillId !== "";
  const hasNoSkills = mePerson.teach.length === 0 && mePerson.learn.length === 0;

  return (
    <div className="space-y-6">
      {hasNoSkills && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-accent text-accent-foreground">
          <p className="font-semibold">
            Add the skills you teach and want to learn to see match scores.
          </p>
          <Link href="/profile" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Add skills
          </Link>
        </Card>
      )}

      {/* key remounts the form when the URL changes, so "Clear" really clears the fields */}
      <Form
        key={`${q}|${skillId}`}
        action="/find-pair"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Input
          name="q"
          defaultValue={q}
          maxLength={50}
          placeholder="Search name or skill..."
          aria-label="Search"
        />
        <Select name="skill" defaultValue={skillId} aria-label="Filter by skill taught" className="sm:max-w-56">
          <option value="">Teaches: anything</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
        {hasFilters && (
          <Link href="/find-pair" className={buttonClasses({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </Form>

      <p className="text-sm text-muted-foreground">
        {results.length} student{results.length === 1 ? "" : "s"}
      </p>

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((c) => (
            <StudentCard key={c.id} candidate={c} />
          ))}
        </div>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">
            {hasFilters ? "No students match those filters." : "No other students yet."}
          </p>
        </Card>
      )}
    </div>
  );
}

function BrowserSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
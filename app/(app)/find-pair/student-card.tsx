import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Relation } from "@/lib/connections";
import type { Match, Person, SkillRef } from "@/lib/match";
import { ConnectionButton } from "./connection-button";

export type Candidate = {
  id: string;
  username: string;
  fullName: string | null;
  bio: string;
  avatarUrl: string | null;
  points: number;
  person: Person;
  match: Match;
  relation: Relation;
};

export function StudentCard({ candidate: c }: { candidate: Candidate }) {
  const name = c.fullName ?? c.username;
  const names = (list: SkillRef[]) => list.map((s) => s.name).join(", ");

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} src={c.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${c.username}`}
            className="block truncate font-display font-semibold hover:underline"
          >
            {name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">@{c.username}</p>
        </div>
        {c.match.score > 0 && <Badge tone="points">{c.match.score}% match</Badge>}
      </div>

      {c.match.mutual && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <ArrowLeftRight className="size-4 text-primary-ink" />
          Mutual swap possible
        </p>
      )}

      <p className={cn("line-clamp-2 text-sm", !c.bio && "text-muted-foreground")}>
        {c.bio || "No bio yet."}
      </p>

      <SkillRow label="Teaches" skills={c.person.teach} tone="default" />
      <SkillRow label="Wants to learn" skills={c.person.learn} tone="outline" />

      {(c.match.theyCanTeachMe.length > 0 || c.match.iCanTeachThem.length > 0) && (
        <div className="space-y-1 rounded-md border border-line bg-muted p-3 text-sm">
          {c.match.theyCanTeachMe.length > 0 && (
            <p>
              <span className="font-medium">They can teach you:</span>{" "}
              {names(c.match.theyCanTeachMe)}
            </p>
          )}
          {c.match.iCanTeachThem.length > 0 && (
            <p>
              <span className="font-medium">You can teach them:</span>{" "}
              {names(c.match.iCanTeachThem)}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto">
        <ConnectionButton userId={c.id} relation={c.relation} />
      </div>
    </Card>
  );
}

function SkillRow({
  label,
  skills,
  tone,
}: {
  label: string;
  skills: SkillRef[];
  tone: "default" | "outline";
}) {
  if (skills.length === 0) return null;
  const shown = skills.slice(0, 4);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <Badge key={s.id} tone={tone}>
            {s.name}
          </Badge>
        ))}
        {skills.length > shown.length && (
          <Badge tone="outline">+{skills.length - shown.length}</Badge>
        )}
      </div>
    </div>
  );
}

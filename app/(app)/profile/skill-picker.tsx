"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import type { SkillRef } from "@/lib/match";
import { MAX_SKILLS_PER_KIND, type SkillKind } from "@/lib/skills";
import { setSkill } from "./actions";

interface SkillPickerProps {
  skills: SkillRef[];
  initialTeach: string[];
  initialLearn: string[];
}

export function SkillPicker({ skills, initialTeach, initialLearn }: SkillPickerProps) {
  const [teach, setTeach] = useState(() => new Set(initialTeach));
  const [learn, setLearn] = useState(() => new Set(initialLearn));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(kind: SkillKind, skillId: string) {
    const mine = kind === "teach" ? teach : learn;
    const selected = !mine.has(skillId);

    if (selected && mine.size >= MAX_SKILLS_PER_KIND) {
      setError(`You can pick at most ${MAX_SKILLS_PER_KIND} skills to ${kind}.`);
      return;
    }

    // Optimistic update: change the UI now, undo if the server says no
    const prev = { teach, learn };
    const nextTeach = new Set(teach);
    const nextLearn = new Set(learn);
    const [target, other] =
      kind === "teach" ? [nextTeach, nextLearn] : [nextLearn, nextTeach];

    if (selected) {
      target.add(skillId);
      other.delete(skillId); // can't teach and learn the same skill
    } else {
      target.delete(skillId);
    }

    setTeach(nextTeach);
    setLearn(nextLearn);
    setError(null);

    startTransition(async () => {
      const result = await setSkill(skillId, kind, selected);
      if (result.error) {
        setTeach(prev.teach);
        setLearn(prev.learn);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Group
        title="I can teach"
        kind="teach"
        skills={skills}
        selected={teach}
        onToggle={toggle}
      />
      <Group
        title="I want to learn"
        kind="learn"
        skills={skills}
        selected={learn}
        onToggle={toggle}
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface GroupProps {
  title: string;
  kind: SkillKind;
  skills: SkillRef[];
  selected: Set<string>;
  onToggle: (kind: SkillKind, skillId: string) => void;
}

function Group({ title, kind, skills, selected, onToggle }: GroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {title}{" "}
        <span className="text-muted-foreground">
          ({selected.size}/{MAX_SKILLS_PER_KIND})
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const on = selected.has(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(kind, skill.id)}
              className={cn(
                "rounded-full border border-line px-3 py-1 text-sm font-medium transition-colors",
                on
                  ? kind === "teach"
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground text-background"
                  : "bg-card hover:bg-muted"
              )}
            >
              {skill.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

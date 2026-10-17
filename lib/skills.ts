export const SKILL_KINDS = ["teach", "learn"] as const;
export type SkillKind = (typeof SKILL_KINDS)[number]; // "teach" | "learn"

// Keep in sync with the trigger in Step 1
export const MAX_SKILLS_PER_KIND = 8;

export function isSkillKind(value: string): value is SkillKind {
  return (SKILL_KINDS as readonly string[]).includes(value);
}
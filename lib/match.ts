import type { SkillKind } from "@/lib/skills";

export type SkillRef = { id: string; name: string };
export type Person = { teach: SkillRef[]; learn: SkillRef[] };

export type Match = {
  score: number; // 0–100
  theyCanTeachMe: SkillRef[];
  iCanTeachThem: SkillRef[];
  mutual: boolean;
};

type SkillRow = { skill_id: string; kind: string };

// Turn raw user_skills rows into a Person with readable skill names
export function buildPerson(
  rows: SkillRow[],
  skillById: Map<string, SkillRef>
): Person {
  const pick = (kind: SkillKind): SkillRef[] =>
    rows
      .filter((row) => row.kind === kind)
      .flatMap((row) => {
        const skill = skillById.get(row.skill_id); // SkillRef | undefined
        return skill ? [skill] : [];
      });

  return { teach: pick("teach"), learn: pick("learn") };
}

// Score = share of BOTH people's learning goals that the other person covers.
// Example: I want [ML, Stats], they want [React]. They teach ML, I teach React.
//   covered = 2, wanted = 2 + 1 = 3  →  67%
export function computeMatch(me: Person, them: Person): Match {
  const myLearnIds = new Set(me.learn.map((s) => s.id));
  const myTeachIds = new Set(me.teach.map((s) => s.id));

  const theyCanTeachMe = them.teach.filter((s) => myLearnIds.has(s.id));
  const iCanTeachThem = them.learn.filter((s) => myTeachIds.has(s.id));

  const wanted = me.learn.length + them.learn.length;
  const covered = theyCanTeachMe.length + iCanTeachThem.length;

  return {
    score: wanted === 0 ? 0 : Math.round((covered / wanted) * 100),
    theyCanTeachMe,
    iCanTeachThem,
    mutual: theyCanTeachMe.length > 0 && iCanTeachThem.length > 0,
  };
}
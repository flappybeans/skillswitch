export const PERIODS = ["all", "week"] as const;
export type Period = (typeof PERIODS)[number]; // "all" | "week"

export const PERIOD_LABEL: Record<Period, string> = {
  all: "All time",
  week: "This week",
};

export const LEADERBOARD_SIZE = 25;

// A URL param is any string. .find() returns a real Period or undefined, so no `as` cast is needed.
export function parsePeriod(value: string): Period {
  return PERIODS.find((p) => p === value) ?? "all";
}
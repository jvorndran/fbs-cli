import type { Play, PlayType } from "cfbd";

export type PlayKind = "dropback" | "rush" | "excluded" | "unclassified";

export interface ClassifiedPlay {
  play: Play;
  kind: PlayKind;
  attempt: boolean;
  completion: boolean;
  sack: boolean;
  interception: boolean;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

const COMPLETIONS = new Set([
  "pass completion",
  "pass reception",
  "passing touchdown",
]);
const INCOMPLETIONS = new Set(["pass incompletion"]);
const INTERCEPTIONS = new Set([
  "interception",
  "interception return",
  "interception return touchdown",
  "pass interception",
  "pass interception return",
  "pass interception return touchdown",
]);
const SACKS = new Set(["sack"]);
const RUSHES = new Set(["rush", "rushing touchdown"]);

// Versioned against the historical CFBD play taxonomy. These types are known
// but intentionally ineligible for scrimmage-play analysis.
const EXCLUDED = new Set([
  "2pt conversion",
  "blocked field goal",
  "blocked field goal touchdown",
  "blocked pat",
  "blocked punt",
  "blocked punt touchdown",
  "coin toss",
  "defensive 2pt conversion",
  "defensive pat",
  "end of game",
  "end of half",
  "end period",
  "end of regulation",
  "extra point good",
  "extra point missed",
  "field goal good",
  "field goal missed",
  "fumble recovery (opponent)",
  "fumble recovery (own)",
  "fumble",
  "fumble return touchdown",
  "kickoff",
  "kickoff return (defense)",
  "kickoff return (offense)",
  "kickoff return touchdown",
  "kneel down",
  "missed field goal return",
  "missed field goal return touchdown",
  "no play",
  "offensive 1pt safety",
  "other",
  "pass",
  "pat good",
  "pat missed",
  "penalty",
  "placeholder",
  "punt",
  "punt return",
  "punt return touchdown",
  "safety",
  "spike",
  "start of period",
  "timeout",
  "two point pass",
  "two point rush",
  "uncategorized",
]);

const KNOWN_TYPES = new Set([
  ...COMPLETIONS,
  ...INCOMPLETIONS,
  ...INTERCEPTIONS,
  ...SACKS,
  ...RUSHES,
  ...EXCLUDED,
]);

export function classifyPlay(play: Play): ClassifiedPlay {
  const type = normalized(play.playType);
  if (COMPLETIONS.has(type)) {
    return {
      play,
      kind: "dropback",
      attempt: true,
      completion: true,
      sack: false,
      interception: false,
    };
  }
  if (INCOMPLETIONS.has(type)) {
    return {
      play,
      kind: "dropback",
      attempt: true,
      completion: false,
      sack: false,
      interception: false,
    };
  }
  if (INTERCEPTIONS.has(type)) {
    return {
      play,
      kind: "dropback",
      attempt: true,
      completion: false,
      sack: false,
      interception: true,
    };
  }
  if (SACKS.has(type)) {
    return {
      play,
      kind: "dropback",
      attempt: false,
      completion: false,
      sack: true,
      interception: false,
    };
  }
  if (RUSHES.has(type)) {
    return {
      play,
      kind: "rush",
      attempt: false,
      completion: false,
      sack: false,
      interception: false,
    };
  }
  return {
    play,
    kind: EXCLUDED.has(type) ? "excluded" : "unclassified",
    attempt: false,
    completion: false,
    sack: false,
    interception: false,
  };
}

export function isEligible(play: ClassifiedPlay): boolean {
  return play.kind === "dropback" || play.kind === "rush";
}

export function providerTaxonomyChanges(playTypes: readonly PlayType[]): string[] {
  return [...new Set(
    playTypes
      .map((playType) => playType.text)
      .filter((text) => !KNOWN_TYPES.has(normalized(text))),
  )].sort((left, right) => left.localeCompare(right, "en-US"));
}

export function unclassifiedPlayTypes(plays: readonly ClassifiedPlay[]): Array<{
  playType: string;
  count: number;
}> {
  const counts = new Map<string, number>();
  for (const classified of plays) {
    if (classified.kind !== "unclassified") continue;
    counts.set(
      classified.play.playType,
      (counts.get(classified.play.playType) ?? 0) + 1,
    );
  }
  return [...counts]
    .map(([playType, count]) => ({ playType, count }))
    .sort((left, right) => left.playType.localeCompare(right.playType, "en-US"));
}

import type { RateMetric } from "./types";
import type { ClassifiedPlay } from "./play-classification";
import { isEligible } from "./play-classification";
import { rateMetric } from "./metrics";

export type DistanceBucket = "short" | "medium" | "long" | "very_long";
export type FieldPositionZone =
  | "backed_up"
  | "own_territory"
  | "plus_territory"
  | "red_zone";
export type ScoreState =
  | "trailing_9_plus"
  | "trailing_1_8"
  | "tied"
  | "leading_1_8"
  | "leading_9_plus";

export function distanceBucket(distance: number): DistanceBucket {
  if (distance <= 3) return "short";
  if (distance <= 6) return "medium";
  if (distance <= 10) return "long";
  return "very_long";
}

export function fieldPositionZone(yardsToGoal: number): FieldPositionZone {
  if (yardsToGoal >= 80) return "backed_up";
  if (yardsToGoal >= 51) return "own_territory";
  if (yardsToGoal >= 21) return "plus_territory";
  return "red_zone";
}

export function scoreState(play: ClassifiedPlay): ScoreState {
  const margin = play.play.offenseScore - play.play.defenseScore;
  if (margin <= -9) return "trailing_9_plus";
  if (margin < 0) return "trailing_1_8";
  if (margin === 0) return "tied";
  if (margin <= 8) return "leading_1_8";
  return "leading_9_plus";
}

const DISTANCE_ORDER: readonly DistanceBucket[] = [
  "short",
  "medium",
  "long",
  "very_long",
];
const FIELD_ORDER: readonly FieldPositionZone[] = [
  "backed_up",
  "own_territory",
  "plus_territory",
  "red_zone",
];

export type ProeBackoff =
  | "down_distance_field_position_score"
  | "down_distance_score"
  | "down_distance"
  | "down"
  | "league_average";

export interface ProeCell {
  down: number;
  distance: DistanceBucket;
  fieldPosition: FieldPositionZone;
  scoreState: ScoreState;
  actualRate: RateMetric;
  expectedRate: RateMetric;
  proe: {
    value?: number;
    sample: number;
    status?: "insufficient_sample";
  };
  baselineSampleSize: number;
  backoffLevel: ProeBackoff;
}

interface ProeKeys {
  down: number;
  distance: DistanceBucket;
  fieldPosition: FieldPositionZone;
  scoreState: ScoreState;
}

function keys(play: ClassifiedPlay): ProeKeys {
  return {
    down: play.play.down,
    distance: distanceBucket(play.play.distance),
    fieldPosition: fieldPositionZone(play.play.yardsToGoal),
    scoreState: scoreState(play),
  };
}

function sameAtLevel(left: ProeKeys, right: ProeKeys, level: ProeBackoff): boolean {
  if (level === "league_average") return true;
  if (left.down !== right.down) return false;
  if (level === "down") return true;
  if (left.distance !== right.distance) return false;
  if (level === "down_distance") return true;
  if (left.scoreState !== right.scoreState) return false;
  if (level === "down_distance_score") return true;
  return left.fieldPosition === right.fieldPosition;
}

const PROE_LEVELS: readonly ProeBackoff[] = [
  "down_distance_field_position_score",
  "down_distance_score",
  "down_distance",
  "down",
  "league_average",
];

export function calculateProe(
  targetInput: readonly ClassifiedPlay[],
  baselineInput: readonly ClassifiedPlay[],
  minimumCellSize = 50,
): ProeCell[] {
  const target = targetInput.filter(isEligible);
  const baseline = baselineInput.filter(isEligible);
  const targetGroups = new Map<string, ClassifiedPlay[]>();
  for (const play of target) {
    const value = keys(play);
    const key = `${value.down}|${value.distance}|${value.fieldPosition}|${value.scoreState}`;
    const group = targetGroups.get(key) ?? [];
    group.push(play);
    targetGroups.set(key, group);
  }

  return [...targetGroups]
    .map(([key, group]) => {
      const [downValue, distance, fieldPosition, score] = key.split("|") as [
        string,
        DistanceBucket,
        FieldPositionZone,
        ScoreState,
      ];
      const targetKeys: ProeKeys = {
        down: Number(downValue),
        distance,
        fieldPosition,
        scoreState: score,
      };
      let selected: ClassifiedPlay[] = [];
      let backoffLevel: ProeBackoff = "league_average";
      for (const level of PROE_LEVELS) {
        const candidate = baseline.filter((play) => sameAtLevel(keys(play), targetKeys, level));
        if (candidate.length >= minimumCellSize || level === "league_average") {
          selected = candidate;
          backoffLevel = level;
          break;
        }
      }
      const actualPasses = group.filter((play) => play.kind === "dropback").length;
      const expectedPasses = selected.filter((play) => play.kind === "dropback").length;
      const actual = rateMetric(actualPasses, group.length);
      const expected = rateMetric(expectedPasses, selected.length);
      const value = actual.value === undefined || expected.value === undefined
        ? undefined
        : actual.value - expected.value;
      return {
        ...targetKeys,
        actualRate: actual,
        expectedRate: expected,
        proe: value === undefined
          ? { sample: group.length, status: "insufficient_sample" as const }
          : { value, sample: group.length },
        baselineSampleSize: selected.length,
        backoffLevel,
      };
    })
    .sort((left, right) =>
      left.down - right.down ||
      DISTANCE_ORDER.indexOf(left.distance) - DISTANCE_ORDER.indexOf(right.distance) ||
      FIELD_ORDER.indexOf(left.fieldPosition) - FIELD_ORDER.indexOf(right.fieldPosition) ||
      left.scoreState.localeCompare(right.scoreState, "en-US"),
    );
}

export interface AggregateProe {
  actualPassRate?: number;
  expectedPassRate?: number;
  difference?: number;
}

export function calculateAggregateProe(
  targetInput: readonly ClassifiedPlay[],
  baselineInput: readonly ClassifiedPlay[],
  minimumCellSize = 50,
): AggregateProe {
  const cells = calculateProe(targetInput, baselineInput, minimumCellSize);
  const usable = cells.filter((cell) =>
    cell.actualRate.value !== undefined && cell.expectedRate.value !== undefined,
  );
  const plays = usable.reduce((sum, cell) => sum + cell.proe.sample, 0);
  if (plays === 0) return {};
  const actualPassRate = usable.reduce(
    (sum, cell) => sum + cell.actualRate.value! * cell.proe.sample,
    0,
  ) / plays;
  const expectedPassRate = usable.reduce(
    (sum, cell) => sum + cell.expectedRate.value! * cell.proe.sample,
    0,
  ) / plays;
  return {
    actualPassRate,
    expectedPassRate,
    difference: actualPassRate - expectedPassRate,
  };
}

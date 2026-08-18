import type { Drive } from "cfbd";

import type { ClassifiedPlay } from "./play-classification";
import { isEligible } from "./play-classification";
import { averageMetric, rateMetric } from "./metrics";

export interface DriveAnalysis {
  drives: number;
  pointsPerDrive: ReturnType<typeof averageMetric>;
  touchdownDriveRate: ReturnType<typeof rateMetric>;
  emptyDriveRate: ReturnType<typeof rateMetric>;
  threeAndOutRate: ReturnType<typeof rateMetric>;
  scoringOpportunityRate: ReturnType<typeof rateMetric>;
  pointsPerScoringOpportunity: ReturnType<typeof averageMetric>;
  availableYardsPercentage: ReturnType<typeof rateMetric>;
  excludedDrives: number;
}

function isPunt(play: ClassifiedPlay): boolean {
  return play.play.playType.trim().toLocaleLowerCase("en-US") === "punt";
}

function chronological(plays: readonly ClassifiedPlay[]): ClassifiedPlay[] {
  return [...plays].sort((left, right) =>
    (left.play.playNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.play.playNumber ?? Number.MAX_SAFE_INTEGER) ||
    left.play.id.localeCompare(right.play.id, "en-US"),
  );
}

function earnedFirstDown(play: ClassifiedPlay): boolean {
  return play.play.distance > 0 && play.play.yardsGained >= play.play.distance;
}

export function isThreeAndOut(plays: readonly ClassifiedPlay[]): boolean {
  const ordered = chronological(plays);
  const eligible = ordered.filter(isEligible);
  if (
    eligible.length !== 3 ||
    eligible.some(earnedFirstDown) ||
    eligible.slice(1).some(({ play }) => play.down === 1)
  ) return false;
  const finalEligibleIndex = ordered.lastIndexOf(eligible[eligible.length - 1]!);
  return ordered.slice(finalEligibleIndex + 1).some(isPunt);
}

function isTouchdownDrive(drive: Drive, points: number): boolean {
  return /(?:^|\b)(?:td|touchdown)(?:\b|$)/i.test(drive.driveResult) || points >= 6;
}

export function analyzeDrives(
  drives: readonly Drive[],
  plays: readonly ClassifiedPlay[],
): DriveAnalysis {
  const byDrive = new Map<string, ClassifiedPlay[]>();
  for (const play of plays) {
    const group = byDrive.get(play.play.driveId) ?? [];
    group.push(play);
    byDrive.set(play.play.driveId, group);
  }

  const included = drives.flatMap((drive) => {
    const drivePlays = byDrive.get(drive.id) ?? [];
    return drivePlays.some(isEligible) ? [{ drive, plays: drivePlays }] : [];
  });
  const points = included.map(({ drive }) =>
    Math.max(0, drive.endOffenseScore - drive.startOffenseScore),
  );
  const opportunities = included.filter(({ plays: drivePlays }) =>
    drivePlays.some((classified) =>
      isEligible(classified) &&
      (
        classified.play.yardsToGoal <= 40 ||
        (
          !classified.interception &&
          classified.play.yardsToGoal - Math.max(0, classified.play.yardsGained) <= 40
        )
      ),
    ),
  );
  const opportunityPoints = opportunities.reduce(
    (sum, { drive }) => sum + Math.max(0, drive.endOffenseScore - drive.startOffenseScore),
    0,
  );
  const availableYards = included.reduce(
    (sum, { drive }) => sum + drive.startYardsToGoal,
    0,
  );
  const gainedYards = included.reduce((sum, { drive }) => sum + drive.yards, 0);

  return {
    drives: included.length,
    pointsPerDrive: averageMetric(
      points.reduce((sum, value) => sum + value, 0),
      included.length,
    ),
    touchdownDriveRate: rateMetric(
      included.filter(({ drive }, index) => isTouchdownDrive(drive, points[index] ?? 0)).length,
      included.length,
    ),
    emptyDriveRate: rateMetric(points.filter((value) => value === 0).length, included.length),
    threeAndOutRate: rateMetric(
      included.filter(({ plays: drivePlays }) => isThreeAndOut(drivePlays)).length,
      included.length,
    ),
    scoringOpportunityRate: rateMetric(opportunities.length, included.length),
    pointsPerScoringOpportunity: averageMetric(opportunityPoints, opportunities.length),
    availableYardsPercentage: rateMetric(gainedYards, availableYards),
    excludedDrives: drives.length - included.length,
  };
}

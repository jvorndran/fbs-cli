import type { AdvancedGameStat, GameHavocStats } from "cfbd";

import type { AverageMetric, RateMetric, SampleMetric } from "./types";
import type { ClassifiedPlay } from "./play-classification";
import { isEligible } from "./play-classification";

export function rateMetric(numerator: number, denominator: number): RateMetric {
  return denominator === 0
    ? { numerator, denominator, status: "insufficient_sample" }
    : { value: numerator / denominator, numerator, denominator };
}

export function averageMetric(total: number, sample: number): AverageMetric {
  return sample === 0
    ? { total, sample, status: "insufficient_sample" }
    : { value: total / sample, total, sample };
}

export function sampleMetric(value: number | undefined, sample: number): SampleMetric {
  return value === undefined || sample === 0
    ? { sample, status: "insufficient_sample" }
    : { value, sample };
}

export function isSuccessful(play: ClassifiedPlay): boolean {
  if (play.interception) return false;
  const { down, distance, yardsGained } = play.play;
  if (down === 1) return yardsGained >= distance * 0.5;
  if (down === 2) return yardsGained >= distance * 0.7;
  if (down === 3 || down === 4) return yardsGained >= distance;
  return false;
}

export function isExplosive(play: ClassifiedPlay): boolean {
  if (play.interception) return false;
  return play.kind === "rush"
    ? play.play.yardsGained >= 10
    : play.kind === "dropback" && play.play.yardsGained >= 20;
}

function ppaValues(plays: readonly ClassifiedPlay[]): number[] {
  return plays.flatMap(({ play }) => play.ppa === null ? [] : [play.ppa]);
}

export interface PlayMetricReport {
  plays: number;
  earlyDownPassRate: RateMetric;
  successRate: RateMetric;
  positivePpaRate: RateMetric;
  ppaPerPlay: AverageMetric;
  totalPpa: SampleMetric;
  explosivePlayRate: RateMetric;
  negativePlayRate: RateMetric;
  rushRate: RateMetric;
  dropbackRate: RateMetric;
  passing: {
    dropbacks: number;
    attempts: number;
    successRate: RateMetric;
    positivePpaRate: RateMetric;
    ppaPerDropback: AverageMetric;
    explosiveRate: RateMetric;
    sackRate: RateMetric;
  };
  rushing: {
    rushes: number;
    successRate: RateMetric;
    positivePpaRate: RateMetric;
    ppaPerRush: AverageMetric;
    explosiveRate: RateMetric;
    stuffRate: RateMetric;
    powerSuccess: RateMetric;
  };
}

export function aggregatePlayMetrics(input: readonly ClassifiedPlay[]): PlayMetricReport {
  const plays = input.filter(isEligible);
  const dropbacks = plays.filter((play) => play.kind === "dropback");
  const rushes = plays.filter((play) => play.kind === "rush");
  const early = plays.filter(({ play }) => play.down === 1 || play.down === 2);
  const ppa = ppaValues(plays);
  const passPpa = ppaValues(dropbacks);
  const rushPpa = ppaValues(rushes);
  const power = rushes.filter(({ play }) =>
    (play.down === 3 || play.down === 4) &&
    Math.min(play.distance, play.yardsToGoal) <= 2,
  );
  const powerSuccesses = power.filter(({ play }) =>
    play.scoring || play.yardsGained >= Math.min(play.distance, play.yardsToGoal),
  ).length;

  return {
    plays: plays.length,
    earlyDownPassRate: rateMetric(
      early.filter((play) => play.kind === "dropback").length,
      early.length,
    ),
    successRate: rateMetric(plays.filter(isSuccessful).length, plays.length),
    positivePpaRate: rateMetric(ppa.filter((value) => value > 0).length, ppa.length),
    ppaPerPlay: averageMetric(ppa.reduce((sum, value) => sum + value, 0), ppa.length),
    totalPpa: sampleMetric(
      ppa.length === 0 ? undefined : ppa.reduce((sum, value) => sum + value, 0),
      ppa.length,
    ),
    explosivePlayRate: rateMetric(plays.filter(isExplosive).length, plays.length),
    negativePlayRate: rateMetric(
      plays.filter(({ play }) => play.yardsGained < 0).length,
      plays.length,
    ),
    rushRate: rateMetric(rushes.length, plays.length),
    dropbackRate: rateMetric(dropbacks.length, plays.length),
    passing: {
      dropbacks: dropbacks.length,
      attempts: dropbacks.filter((play) => play.attempt).length,
      successRate: rateMetric(dropbacks.filter(isSuccessful).length, dropbacks.length),
      positivePpaRate: rateMetric(
        passPpa.filter((value) => value > 0).length,
        passPpa.length,
      ),
      ppaPerDropback: averageMetric(
        passPpa.reduce((sum, value) => sum + value, 0),
        passPpa.length,
      ),
      explosiveRate: rateMetric(dropbacks.filter(isExplosive).length, dropbacks.length),
      sackRate: rateMetric(dropbacks.filter((play) => play.sack).length, dropbacks.length),
    },
    rushing: {
      rushes: rushes.length,
      successRate: rateMetric(rushes.filter(isSuccessful).length, rushes.length),
      positivePpaRate: rateMetric(
        rushPpa.filter((value) => value > 0).length,
        rushPpa.length,
      ),
      ppaPerRush: averageMetric(
        rushPpa.reduce((sum, value) => sum + value, 0),
        rushPpa.length,
      ),
      explosiveRate: rateMetric(rushes.filter(isExplosive).length, rushes.length),
      stuffRate: rateMetric(
        rushes.filter(({ play }) => play.yardsGained <= 0).length,
        rushes.length,
      ),
      powerSuccess: rateMetric(powerSuccesses, power.length),
    },
  };
}

export function aggregateLineYards(
  rows: readonly AdvancedGameStat[],
  side: "offense" | "defense",
  recordedRushes: number,
): AverageMetric {
  const total = rows.reduce((sum, row) => sum + row[side].lineYardsTotal, 0);
  return averageMetric(total, recordedRushes);
}

export function aggregateHavoc(
  rows: readonly GameHavocStats[],
  side: "offense" | "defense",
): {
  label: "pressure_proxy";
  db: RateMetric;
  frontSeven: RateMetric;
  total: RateMetric;
} {
  const values = rows.map((row) => row[side]);
  const plays = values.reduce((sum, value) => sum + value.totalPlays, 0);
  return {
    label: "pressure_proxy",
    db: rateMetric(values.reduce((sum, value) => sum + value.dbHavocEvents, 0), plays),
    frontSeven: rateMetric(
      values.reduce((sum, value) => sum + value.frontSevenHavocEvents, 0),
      plays,
    ),
    total: rateMetric(
      values.reduce((sum, value) => sum + value.totalHavocEvents, 0),
      plays,
    ),
  };
}

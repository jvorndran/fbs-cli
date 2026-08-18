import { describe, expect, test } from "bun:test";
import type { Drive, Game, GamePlayerStats, Play } from "cfbd";

import {
  classifyPlay,
  type ClassifiedPlay,
} from "../src/analysis/play-classification.ts";
import {
  aggregatePlayMetrics,
  isExplosive,
  isSuccessful,
  rateMetric,
} from "../src/analysis/metrics.ts";
import {
  calculateAggregateProe,
  calculateProe,
  distanceBucket,
  fieldPositionZone,
} from "../src/analysis/situations.ts";
import { analyzeDrives, isThreeAndOut } from "../src/analysis/drives.ts";
import { analyzePlayerRoles, selectPlayerRoles } from "../src/analysis/players.ts";
import { calculateAdjustedStrength } from "../src/analysis/adjustment.ts";
import { roundAnalysisValue } from "../src/analysis/report.ts";

let playCounter = 0;
function play(overrides: Partial<Play> = {}): Play {
  playCounter += 1;
  return {
    id: `play-${playCounter}`,
    driveId: "drive-1",
    gameId: 1,
    driveNumber: 1,
    playNumber: playCounter,
    offense: "Florida State",
    offenseConference: "ACC",
    offenseScore: 0,
    defense: "Miami",
    home: "Florida State",
    away: "Miami",
    defenseConference: "ACC",
    defenseScore: 0,
    period: 1,
    clock: { minutes: 12, seconds: 0 },
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    yardline: 25,
    yardsToGoal: 75,
    down: 1,
    distance: 10,
    yardsGained: 5,
    scoring: false,
    playType: "Rush",
    playText: "test",
    ppa: 0.1,
    wallclock: null,
    ...overrides,
  };
}

function classified(overrides: Partial<Play> = {}): ClassifiedPlay {
  return classifyPlay(play(overrides));
}

function game(
  id: number,
  homeTeam: string,
  awayTeam: string,
): Game {
  return {
    id,
    season: 2026,
    week: id,
    seasonType: "regular",
    startDate: `2026-09-${String(id).padStart(2, "0")}T16:00:00Z`,
    startTimeTBD: false,
    completed: true,
    neutralSite: false,
    conferenceGame: true,
    attendance: null,
    venueId: null,
    venue: null,
    homeId: id * 10,
    homeTeam,
    homeConference: "ACC",
    homeClassification: "fbs",
    homePoints: 28,
    homeLineScores: null,
    homePostgameWinProbability: null,
    homePregameElo: null,
    homePostgameElo: null,
    awayId: id * 10 + 1,
    awayTeam,
    awayConference: "ACC",
    awayClassification: "fbs",
    awayPoints: 14,
    awayLineScores: null,
    awayPostgameWinProbability: null,
    awayPregameElo: null,
    awayPostgameElo: null,
    excitementIndex: null,
    highlights: null,
    notes: null,
    playoff: null,
  };
}

describe("analysis play formulas", () => {
  test("uses exact success and explosive boundaries", () => {
    expect(isSuccessful(classified({ down: 1, distance: 10, yardsGained: 5 }))).toBe(true);
    expect(isSuccessful(classified({ down: 1, distance: 10, yardsGained: 4 }))).toBe(false);
    expect(isSuccessful(classified({ down: 2, distance: 10, yardsGained: 7 }))).toBe(true);
    expect(isSuccessful(classified({ down: 2, distance: 10, yardsGained: 6 }))).toBe(false);
    expect(isSuccessful(classified({ down: 3, distance: 2, yardsGained: 2 }))).toBe(true);
    expect(isSuccessful(classified({ down: 4, distance: 2, yardsGained: 1 }))).toBe(false);

    expect(isExplosive(classified({ playType: "Rush", yardsGained: 10 }))).toBe(true);
    expect(isExplosive(classified({ playType: "Rush", yardsGained: 9 }))).toBe(false);
    expect(isExplosive(classified({ playType: "Pass Reception", yardsGained: 20 }))).toBe(true);
    expect(isExplosive(classified({ playType: "Pass Reception", yardsGained: 19 }))).toBe(false);
  });

  test("counts sacks as dropbacks but not attempts and preserves missing PPA coverage", () => {
    const report = aggregatePlayMetrics([
      classified({ playType: "Pass Reception", ppa: 0.4 }),
      classified({ playType: "Pass Completion", ppa: 0.2 }),
      classified({ playType: "Pass Incompletion", ppa: null }),
      classified({ playType: "Pass Interception Return", ppa: -0.5 }),
      classified({ playType: "Interception Return Touchdown", ppa: -1 }),
      classified({ playType: "Sack", yardsGained: -7, ppa: -0.8 }),
      classified({ playType: "Rush", yardsGained: 0, ppa: 0 }),
    ]);

    expect(report.passing).toMatchObject({ dropbacks: 6, attempts: 5 });
    expect(report.passing.sackRate).toEqual({ value: 1 / 6, numerator: 1, denominator: 6 });
    expect(report.ppaPerPlay).toEqual({ value: -1.7 / 6, total: -1.7, sample: 6 });
    expect(report.rushing.stuffRate).toEqual({ value: 1, numerator: 1, denominator: 1 });
  });

  test("never treats interception-return yardage as offensive success or explosiveness", () => {
    const interception = classified({
      playType: "Pass Interception Return",
      down: 1,
      distance: 10,
      yardsGained: 25,
      ppa: -2,
    });

    expect(interception.interception).toBe(true);
    expect(isSuccessful(interception)).toBe(false);
    expect(isExplosive(interception)).toBe(false);
  });

  test("emits insufficient_sample without a value for zero denominators", () => {
    expect(rateMetric(0, 0)).toEqual({
      numerator: 0,
      denominator: 0,
      status: "insufficient_sample",
    });
  });

  test("buckets distance and field position at exact boundaries", () => {
    expect([1, 3, 4, 6, 7, 10, 11].map(distanceBucket)).toEqual([
      "short", "short", "medium", "medium", "long", "long", "very_long",
    ]);
    expect([80, 79, 51, 50, 21, 20, 1].map(fieldPositionZone)).toEqual([
      "backed_up",
      "own_territory",
      "own_territory",
      "plus_territory",
      "plus_territory",
      "red_zone",
      "red_zone",
    ]);
  });

  test("PROE backs off in the declared order", () => {
    const target = [classified({ playType: "Pass Reception", down: 1, distance: 10 })];
    const exact = Array.from({ length: 49 }, () =>
      classified({ playType: "Rush", down: 1, distance: 10, yardsToGoal: 75 }),
    );
    const downDistanceScore = classified({
      playType: "Pass Reception",
      down: 1,
      distance: 10,
      yardsToGoal: 40,
    });
    const [cell] = calculateProe(target, [...exact, downDistanceScore], 50);
    expect(cell?.backoffLevel).toBe("down_distance_score");
    expect(cell?.baselineSampleSize).toBe(50);
    expect(cell?.expectedRate.value).toBe(1 / 50);
    expect(cell?.proe.value).toBe(49 / 50);
  });

  test("weights aggregate PROE expectations by target situation plays", () => {
    const target = [
      classified({ playType: "Pass Reception", down: 1, distance: 10 }),
      ...Array.from({ length: 3 }, () =>
        classified({ playType: "Pass Reception", down: 2, distance: 2 }),
      ),
    ];
    const baseline = [
      classified({ playType: "Pass Reception", down: 1, distance: 10 }),
      classified({ playType: "Rush", down: 2, distance: 2 }),
    ];
    expect(calculateAggregateProe(target, baseline, 1)).toEqual({
      actualPassRate: 1,
      expectedPassRate: 0.25,
      difference: 0.75,
    });
  });

  test("rounds public values only at presentation and normalizes negative zero", () => {
    expect(roundAnalysisValue(1.005, 2)).toBe(1.01);
    expect(roundAnalysisValue(-1.005, 2)).toBe(-1.01);
    expect(roundAnalysisValue(2.135, 2)).toBe(2.14);
    expect(roundAnalysisValue(2.0035, 3)).toBe(2.004);
    expect(roundAnalysisValue(-0.0001, 1)).toBe(0);
    expect(Object.is(roundAnalysisValue(-0.0001, 1), -0)).toBe(false);
  });
});

describe("drive and player role formulas", () => {
  test("requires exactly three eligible plays, no first down, then a punt", () => {
    const plays = [
      classified({ playNumber: 1, down: 1, distance: 10, yardsGained: 3 }),
      classified({ playNumber: 2, down: 2, distance: 7, yardsGained: 2 }),
      classified({ playNumber: 3, down: 3, distance: 5, yardsGained: 0 }),
      classified({ playNumber: 4, playType: "Punt" }),
    ];
    expect(isThreeAndOut(plays)).toBe(true);
    expect(isThreeAndOut([
      ...plays.slice(0, 2),
      classified({ playNumber: 3, down: 3, distance: 5, yardsGained: 5 }),
      plays[3]!,
    ])).toBe(false);
    expect(isThreeAndOut([
      plays[0]!,
      classified({ playNumber: 2, down: 1, distance: 10, yardsGained: 2 }),
      plays[2]!,
      plays[3]!,
    ])).toBe(false);
  });

  test("calculates drive rates and excludes kneel-only drives", () => {
    const drives = [
      {
        offense: "Florida State",
        offenseConference: "ACC",
        defense: "Miami",
        defenseConference: "ACC",
        gameId: 1,
        id: "drive-1",
        driveNumber: 1,
        scoring: false,
        startPeriod: 1,
        startYardline: 25,
        startYardsToGoal: 75,
        startTime: { minutes: 15, seconds: 0 },
        endPeriod: 1,
        endYardline: 30,
        endYardsToGoal: 70,
        endTime: { minutes: 13, seconds: 0 },
        elapsed: { minutes: 2, seconds: 0 },
        plays: 4,
        yards: 5,
        driveResult: "PUNT",
        isHomeOffense: true,
        startOffenseScore: 0,
        startDefenseScore: 0,
        endOffenseScore: 0,
        endDefenseScore: 0,
      },
      {
        offense: "Florida State",
        offenseConference: "ACC",
        defense: "Miami",
        defenseConference: "ACC",
        gameId: 1,
        id: "drive-kneel",
        driveNumber: 2,
        scoring: false,
        startPeriod: 4,
        startYardline: 50,
        startYardsToGoal: 50,
        startTime: { minutes: 1, seconds: 0 },
        endPeriod: 4,
        endYardline: 49,
        endYardsToGoal: 51,
        endTime: { minutes: 0, seconds: 0 },
        elapsed: { minutes: 1, seconds: 0 },
        plays: 1,
        yards: -1,
        driveResult: "END OF GAME",
        isHomeOffense: true,
        startOffenseScore: 7,
        startDefenseScore: 0,
        endOffenseScore: 7,
        endDefenseScore: 0,
      },
    ] satisfies Drive[];
    const plays = [
      classified({ driveId: "drive-1", playNumber: 1, down: 1, distance: 10, yardsGained: 3 }),
      classified({ driveId: "drive-1", playNumber: 2, down: 2, distance: 7, yardsGained: 2 }),
      classified({ driveId: "drive-1", playNumber: 3, down: 3, distance: 5, yardsGained: 0 }),
      classified({ driveId: "drive-1", playNumber: 4, playType: "Punt" }),
      classified({ driveId: "drive-kneel", playType: "Kneel Down" }),
    ];
    const report = analyzeDrives(drives, plays);
    expect(report.drives).toBe(1);
    expect(report.excludedDrives).toBe(1);
    expect(report.threeAndOutRate.value).toBe(1);
    expect(report.availableYardsPercentage.value).toBe(5 / 75);
  });

  test("does not use interception-return yards to create a scoring opportunity", () => {
    const turnoverDrive = {
      offense: "Florida State",
      offenseConference: "ACC",
      defense: "Miami",
      defenseConference: "ACC",
      gameId: 1,
      id: "drive-interception",
      driveNumber: 1,
      scoring: false,
      startPeriod: 1,
      startYardline: 25,
      startYardsToGoal: 75,
      startTime: { minutes: 15, seconds: 0 },
      endPeriod: 1,
      endYardline: 25,
      endYardsToGoal: 75,
      endTime: { minutes: 14, seconds: 0 },
      elapsed: { minutes: 1, seconds: 0 },
      plays: 1,
      yards: 0,
      driveResult: "INTERCEPTION",
      isHomeOffense: true,
      startOffenseScore: 0,
      startDefenseScore: 0,
      endOffenseScore: 0,
      endDefenseScore: 0,
    } satisfies Drive;
    const report = analyzeDrives([turnoverDrive], [
      classified({
        driveId: turnoverDrive.id,
        playType: "Pass Interception Return",
        yardsToGoal: 75,
        yardsGained: 50,
      }),
    ]);

    expect(report.scoringOpportunityRate).toEqual({
      value: 0,
      numerator: 0,
      denominator: 1,
    });
  });

  test("uses stable large player IDs and rolling zero rows", () => {
    const row = (id: number, attempts: string, carries: string): GamePlayerStats => ({
      id,
      teams: [{
        team: "Florida State",
        conference: "ACC",
        homeAway: "home",
        points: 7,
        categories: [
          { name: "passing", types: [{ name: "C/ATT", athletes: [
            { id: "9007199254740993", name: "Large ID", stat: attempts },
          ] }] },
          { name: "rushing", types: [{ name: "CAR", athletes: [
            { id: "9007199254740993", name: "Large ID", stat: carries },
          ] }] },
        ],
      }],
    });
    const result = analyzePlayerRoles([row(1, "1/10", "2"), row(4, "2/20", "8")], "Florida State", [1, 2, 3, 4]);
    expect(result.players[0]?.id).toBe("9007199254740993");
    expect(result.players[0]?.lastFour.passAttempts).toBe(30);
    expect(result.players[0]?.lastTwo.carries).toBe(8);
    expect(result.players[0]?.previousTwo.carries).toBe(2);
    expect(result.players[0]?.lastTwoMinusPreviousTwo.carries).toBe(6);
  });

  test("selects two passers and eight skill players with deterministic deduplication", () => {
    const athletes = Array.from({ length: 12 }, (_, index) => ({
      id: String(9_007_199_254_740_993n + BigInt(index)),
      name: `Player ${index + 1}`,
    }));
    const row = {
      id: 1,
      teams: [{
        team: "Florida State",
        conference: "ACC",
        homeAway: "home",
        points: 42,
        categories: [
          {
            name: "passing",
            types: [{
              name: "ATT",
              athletes: athletes.slice(0, 3).map((athlete, index) => ({
                ...athlete,
                stat: String(30 - index * 10),
              })),
            }],
          },
          {
            name: "rushing",
            types: [{
              name: "CAR",
              athletes: athletes.map((athlete, index) => ({
                ...athlete,
                stat: String(20 - index),
              })),
            }],
          },
        ],
      }],
    } as GamePlayerStats;
    const selected = selectPlayerRoles(
      analyzePlayerRoles([row], "Florida State", [1]).players,
    );
    expect(selected).toHaveLength(8);
    expect(selected.slice(0, 2).map((player) => player.id)).toEqual([
      athletes[0]!.id,
      athletes[1]!.id,
    ]);
    expect(selected[0]?.roles).toEqual(["passer", "skill"]);
    expect(new Set(selected.map((player) => player.id)).size).toBe(selected.length);
  });
});

describe("opponent adjustment", () => {
  test("shrinks samples, applies fallback counts, and ranks stronger units higher", () => {
    const games = [
      game(1, "Florida State", "Miami"),
      game(2, "Florida State", "Clemson"),
      game(3, "Miami", "Clemson"),
    ];
    const plays: ClassifiedPlay[] = [];
    const add = (gameId: number, offense: string, defense: string, yards: number, ppa: number) => {
      for (let index = 0; index < 8; index += 1) {
        plays.push(classified({
          gameId,
          offense,
          defense,
          home: offense,
          away: defense,
          playType: index % 2 === 0 ? "Pass Reception" : "Rush",
          yardsGained: yards,
          ppa,
        }));
      }
    };
    add(1, "Florida State", "Miami", 12, 0.6);
    add(1, "Miami", "Florida State", 1, -0.3);
    add(2, "Florida State", "Clemson", 11, 0.5);
    add(2, "Clemson", "Florida State", 2, -0.2);
    add(3, "Miami", "Clemson", 4, 0.05);
    add(3, "Clemson", "Miami", 4, 0.05);

    const report = calculateAdjustedStrength(plays, games, "Florida State", "fbs");
    expect(report.offense.overall.rank).toBe(1);
    expect(report.defense.overall.rank).toBe(1);
    expect(report.offense.overall.sample).toBe(16);
    expect(report.offense.overall.shrinkageWeight).toBe(16 / 216);
    expect(report.offense.overall.zScore).toBeGreaterThan(0);
  });
});

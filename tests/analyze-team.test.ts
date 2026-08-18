import { describe, expect, test } from "bun:test";
import type { CfbdApi } from "../src/cfbd/api.ts";
import type { Game, Play } from "cfbd";
import { parse } from "yaml";

import { CfbdRequestError } from "../src/errors.ts";
import { runCli } from "../src/index.ts";

interface Call {
  method: string;
  query: Record<string, unknown>;
}

function game(options: {
  id: number;
  week: number;
  startDate: string;
  completed: boolean;
  home?: string;
  away?: string;
}): Game {
  const home = options.home ?? "Florida State";
  const away = options.away ?? "Miami";
  return {
    id: options.id,
    season: 2026,
    week: options.week,
    seasonType: "regular",
    startDate: options.startDate,
    startTimeTBD: false,
    completed: options.completed,
    neutralSite: false,
    conferenceGame: true,
    attendance: null,
    venueId: null,
    venue: null,
    homeId: options.id * 10,
    homeTeam: home,
    homeConference: "ACC",
    homeClassification: "fbs",
    homePoints: options.completed ? 24 : null,
    homeLineScores: null,
    homePostgameWinProbability: null,
    homePregameElo: null,
    homePostgameElo: null,
    awayId: options.id * 10 + 1,
    awayTeam: away,
    awayConference: "ACC",
    awayClassification: "fbs",
    awayPoints: options.completed ? 17 : null,
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

function play(gameId: number, week: number, offense = "Florida State", defense = "Miami"): Play {
  return {
    id: `${gameId}-${offense}`,
    driveId: `${gameId}-drive-${offense}`,
    gameId,
    driveNumber: 1,
    playNumber: week + 1,
    offense,
    offenseConference: "ACC",
    offenseScore: 0,
    defense,
    home: offense,
    away: defense,
    defenseConference: "ACC",
    defenseScore: 0,
    period: 1,
    clock: { minutes: 14, seconds: 0 },
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    yardline: 25,
    yardsToGoal: 75,
    down: 1,
    distance: 10,
    yardsGained: 6,
    scoring: false,
    playType: "Rush",
    playText: "rush",
    ppa: 0.2,
    wallclock: null,
  };
}

function fixtureApi(options: {
  schedule?: Game[];
  failWeek?: number;
  delayWeekly?: boolean;
} = {}): {
  api: CfbdApi;
  calls: Call[];
  maxWeekly: () => number;
} {
  const schedule = options.schedule ?? [
    game({ id: 100, week: 0, startDate: "2026-08-29T16:00:00Z", completed: true }),
    game({ id: 102, week: 2, startDate: "2026-09-12T16:00:00Z", completed: true, away: "Clemson" }),
    game({ id: 103, week: 3, startDate: "2026-09-19T16:00:00Z", completed: false, away: "Duke" }),
    game({ id: 104, week: 4, startDate: "2026-10-03T16:00:00Z", completed: true, away: "Virginia" }),
    game({ id: 200, week: 0, startDate: "2026-08-29T20:00:00Z", completed: true, home: "NC State", away: "Wake Forest" }),
    game({ id: 202, week: 2, startDate: "2026-09-12T20:00:00Z", completed: true, home: "NC State", away: "Wake Forest" }),
  ];
  const calls: Call[] = [];
  let activeWeekly = 0;
  let peakWeekly = 0;
  const api = new Proxy({} as CfbdApi, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return async (query: Record<string, unknown> = {}) => {
        calls.push({ method: property, query: { ...query } });
        if (property === "games") return schedule;
        if (property === "playTypes") {
          return [
            { id: 14, text: "Rush", abbreviation: "RUSH" },
            { id: 6, text: "Pass Reception", abbreviation: "PASS" },
          ];
        }
        if (property === "plays") {
          const week = Number(query.week);
          activeWeekly += 1;
          peakWeekly = Math.max(peakWeekly, activeWeekly);
          try {
            if (options.delayWeekly === true) {
              await new Promise((resolve) => setTimeout(resolve, 5));
            }
            if (week === options.failWeek) {
              throw new CfbdRequestError({
                code: "cfbd_server_error",
                status: 500,
                message: "weekly play request failed",
              });
            }
            const games = schedule.filter((candidate) => candidate.week === week);
            return games.flatMap((candidate) => [
              play(candidate.id, week, candidate.homeTeam, candidate.awayTeam),
              play(candidate.id, week, candidate.awayTeam, candidate.homeTeam),
            ]);
          } finally {
            activeWeekly -= 1;
          }
        }
        return [];
      };
    },
  });
  return { api, calls, maxWeekly: () => peakWeekly };
}

async function execute(
  api: CfbdApi,
  argv: string[],
  environment: Record<string, string> = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(argv, {
    api,
    environment,
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr };
}

function deepKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(deepKeys);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) => [key, ...deepKeys(entry)]);
}

const BASE_ARGS = [
  "analyze",
  "team",
  "--year",
  "2026",
  "--team",
  "Florida State",
  "--as-of",
  "2026-09-20T00:00:00Z",
];

describe("analyze team orchestration", () => {
  test("filters exact completed game IDs across Week 0, byes, incomplete, and future games", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, BASE_ARGS);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const document = parse(result.stdout) as Record<string, any>;
    expect(document).toMatchObject({
      team: "Florida State",
      year: 2026,
      as_of: "2026-09-20T00:00:00.000Z",
      games: {
        scheduled: 4,
        included: 2,
        wins: 2,
        losses: 0,
        ties: 0,
        ids: [100, 102],
      },
    });
    expect(Object.keys(document)).toEqual([
      "team", "year", "as_of", "games", "warnings", "analysis",
    ]);
    const keys = deepKeys(document);
    expect(keys).not.toContain("analysis_version");
    expect(keys).not.toContain("lineage");
    expect(keys).not.toContain("z_score");
    expect(keys).not.toContain("numerator");
    expect(keys).not.toContain("denominator");
    expect(keys).not.toContain("sample");
    expect(keys).not.toContain("total");
    expect(
      fixture.calls.filter((call) => call.method === "plays").map((call) => call.query.week),
    ).toEqual([0, 2]);
    expect(fixture.calls.filter((call) => call.method === "games")).toHaveLength(1);
    expect(fixture.calls.filter((call) => call.method === "drives")).toHaveLength(1);
    expect(document.analysis.offense.early_down_pass_pct).toBe(0);
    expect(document.analysis.offense.ppa_per_play).toBe(0.2);
  });

  test("uses a target kickoff as an exclusive reproducible cutoff", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--before-game-id", "103",
    ]);
    expect(result.exitCode).toBe(0);
    const document = parse(result.stdout) as Record<string, any>;
    expect(document.as_of).toBe("2026-09-19T16:00:00.000Z");
    expect(document.games.ids).toEqual([100, 102]);
  });

  test("limits concurrent weekly play requests to three and preserves lineage order", async () => {
    const schedule = Array.from({ length: 5 }, (_, index) =>
      game({
        id: 300 + index,
        week: index,
        startDate: `2026-09-${String(index + 1).padStart(2, "0")}T16:00:00Z`,
        completed: true,
        away: `Opponent ${index}`,
      }),
    );
    const fixture = fixtureApi({ schedule, delayWeekly: true });
    const result = await execute(fixture.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-10-01T00:00:00Z",
    ]);
    expect(result.exitCode).toBe(0);
    expect(fixture.maxWeekly()).toBe(3);
    expect(
      fixture.calls.filter((call) => call.method === "plays")
        .map((call) => call.query.week),
    ).toEqual([0, 1, 2, 3, 4]);
  });

  test("makes every source request again on repeated invocations", async () => {
    const fixture = fixtureApi();
    expect((await execute(fixture.api, BASE_ARGS)).exitCode).toBe(0);
    expect((await execute(fixture.api, BASE_ARGS)).exitCode).toBe(0);
    expect(fixture.calls.filter((call) => call.method === "games")).toHaveLength(2);
    expect(fixture.calls.filter((call) => call.method === "plays")).toHaveLength(4);
    expect(fixture.calls.filter((call) => call.method === "playTypes")).toHaveLength(2);
  });

  test("fails atomically with source metadata and empty stdout", async () => {
    const fixture = fixtureApi({ failWeek: 2 });
    const result = await execute(fixture.api, BASE_ARGS);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr)).toEqual({
      error: {
        code: "cfbd_server_error",
        status: 500,
        message: "weekly play request failed",
        command: "analyze team",
        query: {
          year: 2026,
          team: "Florida State",
          as_of: "2026-09-20T00:00:00Z",
        },
        source_endpoint: "/plays",
        source_query: {
          year: 2026,
          week: 2,
          season_type: "both",
          classification: "fbs",
        },
      },
    });
  });

  test("does not start queued weekly requests after a source failure", async () => {
    const schedule = Array.from({ length: 8 }, (_, index) =>
      game({
        id: 600 + index,
        week: index,
        startDate: `2026-09-${String(index + 1).padStart(2, "0")}T16:00:00Z`,
        completed: true,
        away: `Opponent ${index}`,
      }),
    );
    const fixture = fixtureApi({ schedule, failWeek: 0, delayWeekly: true });
    const result = await execute(fixture.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-10-01T00:00:00Z",
    ]);

    expect(result.exitCode).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(
      fixture.calls.filter((call) => call.method === "plays")
        .map((call) => call.query.week),
    ).toEqual([0, 1, 2]);
  });

  test("returns stable unknown-team, invalid-cutoff, and no-games errors", async () => {
    const unknown = fixtureApi();
    const unknownResult = await execute(unknown.api, [
      "analyze", "team", "--year", "2026", "--team", "Not A Team",
      "--as-of", "2026-09-20T00:00:00Z",
    ]);
    expect(parse(unknownResult.stderr)).toMatchObject({
      error: { code: "analysis_unknown_team", command: "analyze team" },
    });

    const conflict = fixtureApi();
    const conflictResult = await execute(conflict.api, [
      ...BASE_ARGS,
      "--before-game-id", "103",
    ]);
    expect(parse(conflictResult.stderr)).toMatchObject({
      error: { code: "analysis_invalid_cutoff", command: "analyze team" },
    });
    expect(conflict.calls).toEqual([]);

    const noGames = fixtureApi();
    const noGamesResult = await execute(noGames.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-01-01T00:00:00Z",
    ]);
    expect(noGamesResult.stdout).toBe("");
    expect(parse(noGamesResult.stderr)).toEqual({
      error: {
        code: "analysis_no_completed_games",
        message: "No completed Florida State games precede the effective cutoff.",
        command: "analyze team",
        query: {
          year: 2026,
          team: "Florida State",
          as_of: "2026-01-01T00:00:00Z",
        },
        effective_as_of: "2026-01-01T00:00:00.000Z",
        scheduled_games: 4,
        hint: "Choose a later --as-of value or a later target with --before-game-id.",
      },
    });
    expect(noGames.calls.map((call) => call.method)).toEqual(["games"]);
  });

  test("rejects calendar-invalid RFC3339 cutoffs before making requests", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-02-30T00:00:00Z",
    ]);

    expect(result.exitCode).toBe(2);
    expect(parse(result.stderr)).toMatchObject({
      error: { code: "analysis_invalid_cutoff", command: "analyze team" },
    });
    expect(fixture.calls).toEqual([]);
  });

  test("includes only explicitly non-default season context", async () => {
    const schedule = [
      game({ id: 100, week: 0, startDate: "2026-08-29T16:00:00Z", completed: true }),
      game({ id: 102, week: 2, startDate: "2026-09-12T16:00:00Z", completed: true }),
    ].map((value) => ({
      ...value,
      homeClassification: "fcs" as const,
      awayClassification: "fcs" as const,
    }));
    const regular = fixtureApi({ schedule });
    const result = await execute(regular.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-09-20T00:00:00Z",
      "--season-type", "regular", "--classification", "fcs",
    ]);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout)).toMatchObject({
      season_type: "regular",
      classification: "fcs",
    });
  });

  test("warns on successful partial sources and omits affected metrics", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, BASE_ARGS);
    const document = parse(result.stdout) as Record<string, any>;
    expect(document.warnings).toEqual(expect.arrayContaining([
      { code: "drives_missing_games", count: 2 },
      { code: "player_stats_missing_games", count: 2 },
      { code: "advanced_stats_missing_games", count: 2 },
      { code: "havoc_stats_missing_games", count: 2 },
      { code: "opponent_adjustment_fallbacks" },
    ]));
    expect(document.analysis.offense.rushing).not.toHaveProperty(
      "line_yards_per_rush",
    );
    expect(document.analysis).not.toHaveProperty("players");
    expect(document.analysis.unavailable_metrics).toContain(
      "analysis.offense.rushing.line_yards_per_rush",
    );
  });

  test("warns about missing completed-game scores and omits the record", async () => {
    const missingScore = {
      ...game({
        id: 700,
        week: 1,
        startDate: "2026-09-01T16:00:00Z",
        completed: true,
      }),
      homePoints: null,
      awayPoints: null,
    };
    const fixture = fixtureApi({ schedule: [missingScore] });
    const result = await execute(fixture.api, [
      "analyze", "team", "--year", "2026", "--team", "Florida State",
      "--as-of", "2026-10-01T00:00:00Z",
    ]);
    const document = parse(result.stdout) as Record<string, any>;
    expect(document.games).toMatchObject({
      scheduled: 1,
      included: 1,
      ids: [700],
    });
    expect(document.games).not.toHaveProperty("wins");
    expect(document.games).not.toHaveProperty("losses");
    expect(document.games).not.toHaveProperty("ties");
    expect(document.warnings).toContainEqual({
      code: "completed_games_missing_scores",
      count: 1,
    });
  });

  test("enforces the shared output limit after completing the atomic report", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, BASE_ARGS, { FBS_MAX_OUTPUT_CHARS: "20" });
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr)).toMatchObject({
      error: { code: "output_too_large", command: "analyze team" },
    });
  });

  test("rejects an invalid output limit before making requests", async () => {
    const fixture = fixtureApi();
    const result = await execute(
      fixture.api,
      BASE_ARGS,
      { FBS_MAX_OUTPUT_CHARS: "invalid" },
    );

    expect(result.exitCode).toBe(2);
    expect(parse(result.stderr)).toMatchObject({
      error: { code: "invalid_output_limit", command: "analyze team" },
    });
    expect(fixture.calls).toEqual([]);
  });

  test("documents all options in help without making requests", async () => {
    const fixture = fixtureApi();
    const result = await execute(fixture.api, ["analyze", "team", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--as-of <RFC3339>");
    expect(result.stdout).toContain("--before-game-id <id>");
    expect(result.stdout).toContain("--classification <value>");
    expect(fixture.calls).toEqual([]);
  });
});

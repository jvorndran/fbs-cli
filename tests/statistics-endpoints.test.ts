import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api.ts";
import type { StatisticsCfbdApi } from "../src/cfbd/api-statistics.ts";
import {
  validateGameHavocStatsQuery,
  validatePlayerGamePpaQuery,
  validatePlayerGameSuccessQuery,
  validatePlayerSearchQuery,
  validatePlayerSeasonOverviewQuery,
  validatePlayerSeasonStatsQuery,
  validatePlayerSeasonSuccessQuery,
  validatePredictedPointsQuery,
  validateReturningProductionQuery,
  validateTeamPpaQuery,
  validateTeamSeasonStatsQuery,
  validateTransferPortalQuery,
  validateWinProbabilityQuery,
} from "../src/cfbd/query-builders-statistics.ts";
import { registerMetricsCommand } from "../src/commands/metrics.ts";
import { registerPlayerCommand } from "../src/commands/player.ts";
import { registerPpaCommand } from "../src/commands/ppa.ts";
import { registerStatsCommand } from "../src/commands/stats.ts";
import type { CommandRuntime } from "../src/runtime.ts";

interface RecordedCall {
  method: keyof StatisticsCfbdApi;
  query: Record<string, unknown>;
}

interface RouteCase {
  label: string;
  argv: readonly string[];
  command: string;
  endpoint: string;
  method: keyof StatisticsCfbdApi;
  query: Record<string, unknown>;
  resultKey: string;
}

const routeCases: RouteCase[] = [
  {
    label: "stats player season",
    argv: [
      "stats", "player", "season", "--year", "2026", "--team", "Florida State",
      "--conference", "ACC", "--start-week", "0", "--end-week", "6",
      "--season-type", "regular", "--category", "passing",
    ],
    command: "stats player season",
    endpoint: "/stats/player/season",
    method: "playerSeasonStats",
    query: {
      year: 2026, team: "Florida State", conference: "ACC", startWeek: 0,
      endWeek: 6, seasonType: "regular", category: "passing",
    },
    resultKey: "player_season_stats",
  },
  {
    label: "stats player success",
    argv: [
      "stats", "player", "success", "--year", "2026", "--player-id", "4433971",
      "--team", "Florida State", "--conference", "ACC", "--start-week", "0",
      "--end-week", "6", "--season-type", "regular", "--threshold", "10",
      "--exclude-garbage-time",
    ],
    command: "stats player success",
    endpoint: "/stats/player/success",
    method: "playerSeasonSuccessRates",
    query: {
      year: 2026, playerId: 4433971, team: "Florida State", conference: "ACC",
      startWeek: 0, endWeek: 6, seasonType: "regular", threshold: 10,
      excludeGarbageTime: true,
    },
    resultKey: "player_success_rates",
  },
  {
    label: "stats player success game",
    argv: [
      "stats", "player", "success", "game", "--year", "2026", "--week", "0",
      "--player-id", "4433971", "--team", "Florida State", "--conference", "ACC",
      "--season-type", "regular", "--threshold", "10", "--exclude-garbage-time",
    ],
    command: "stats player success game",
    endpoint: "/stats/player/success/game",
    method: "playerGameSuccessRates",
    query: {
      year: 2026, week: 0, playerId: 4433971, team: "Florida State",
      conference: "ACC", seasonType: "regular", threshold: 10,
      excludeGarbageTime: true,
    },
    resultKey: "player_game_success_rates",
  },
  {
    label: "stats season",
    argv: [
      "stats", "season", "--year", "2026", "--team", "Florida State",
      "--conference", "ACC", "--start-week", "0", "--end-week", "6",
      "--classification", "fbs",
    ],
    command: "stats season",
    endpoint: "/stats/season",
    method: "teamSeasonStats",
    query: {
      year: 2026, team: "Florida State", conference: "ACC", startWeek: 0,
      endWeek: 6, classification: "fbs",
    },
    resultKey: "team_stats",
  },
  {
    label: "stats categories",
    argv: ["stats", "categories"],
    command: "stats categories",
    endpoint: "/stats/categories",
    method: "statCategories",
    query: {},
    resultKey: "categories",
  },
  {
    label: "stats game havoc",
    argv: [
      "stats", "game", "havoc", "--year", "2026", "--week", "0", "--team",
      "Florida State", "--opponent", "Alabama", "--season-type", "regular",
    ],
    command: "stats game havoc",
    endpoint: "/stats/game/havoc",
    method: "gameHavocStats",
    query: {
      year: 2026, week: 0, team: "Florida State", opponent: "Alabama",
      seasonType: "regular",
    },
    resultKey: "game_havoc_stats",
  },
  {
    label: "player search",
    argv: [
      "player", "search", "--search-term", "Travis", "--year", "2023", "--team",
      "Florida State", "--position", "QB",
    ],
    command: "player search",
    endpoint: "/player/search",
    method: "playerSearch",
    query: { searchTerm: "Travis", year: 2023, team: "Florida State", position: "QB" },
    resultKey: "players",
  },
  {
    label: "player season overview",
    argv: [
      "player", "season", "overview", "--year", "2023", "--player-id", "4360248",
    ],
    command: "player season overview",
    endpoint: "/player/season/overview",
    method: "playerSeasonOverview",
    query: { year: 2023, playerId: 4360248 },
    resultKey: "player_season_overview",
  },
  {
    label: "player returning",
    argv: [
      "player", "returning", "--year", "2026", "--team", "Florida State",
      "--conference", "ACC",
    ],
    command: "player returning",
    endpoint: "/player/returning",
    method: "returningProduction",
    query: { year: 2026, team: "Florida State", conference: "ACC" },
    resultKey: "returning_production",
  },
  {
    label: "player portal",
    argv: ["player", "portal", "--year", "2026"],
    command: "player portal",
    endpoint: "/player/portal",
    method: "transferPortal",
    query: { year: 2026 },
    resultKey: "transfers",
  },
  {
    label: "ppa predicted",
    argv: ["ppa", "predicted", "--down", "1", "--distance", "10"],
    command: "ppa predicted",
    endpoint: "/ppa/predicted",
    method: "predictedPoints",
    query: { down: 1, distance: 10 },
    resultKey: "predicted_points",
  },
  {
    label: "ppa teams",
    argv: [
      "ppa", "teams", "--year", "2026", "--team", "Florida State", "--conference",
      "ACC", "--classification", "fbs", "--exclude-garbage-time",
    ],
    command: "ppa teams",
    endpoint: "/ppa/teams",
    method: "teamPpa",
    query: {
      year: 2026, team: "Florida State", conference: "ACC", classification: "fbs",
      excludeGarbageTime: true,
    },
    resultKey: "team_ppa",
  },
  {
    label: "ppa games",
    argv: [
      "ppa", "games", "--year", "2026", "--week", "0", "--team", "Florida State",
      "--conference", "ACC", "--season-type", "regular", "--classification", "fbs",
      "--exclude-garbage-time",
    ],
    command: "ppa games",
    endpoint: "/ppa/games",
    method: "gamePpa",
    query: {
      year: 2026, week: 0, team: "Florida State", conference: "ACC",
      seasonType: "regular", classification: "fbs", excludeGarbageTime: true,
    },
    resultKey: "game_ppa",
  },
  {
    label: "ppa players games",
    argv: [
      "ppa", "players", "games", "--year", "2026", "--week", "0", "--team",
      "Florida State", "--position", "QB", "--player-id", "4433971", "--threshold",
      "10", "--season-type", "regular", "--exclude-garbage-time",
    ],
    command: "ppa players games",
    endpoint: "/ppa/players/games",
    method: "playerGamePpa",
    query: {
      year: 2026, week: 0, team: "Florida State", position: "QB",
      playerId: "4433971", threshold: 10, seasonType: "regular",
      excludeGarbageTime: true,
    },
    resultKey: "player_game_ppa",
  },
  {
    label: "ppa players season",
    argv: [
      "ppa", "players", "season", "--year", "2026", "--team", "Florida State",
      "--conference", "ACC", "--position", "QB", "--player-id", "4433971",
      "--threshold", "10", "--exclude-garbage-time",
    ],
    command: "ppa players season",
    endpoint: "/ppa/players/season",
    method: "playerSeasonPpa",
    query: {
      year: 2026, team: "Florida State", conference: "ACC", position: "QB",
      playerId: "4433971", threshold: 10, excludeGarbageTime: true,
    },
    resultKey: "player_season_ppa",
  },
  {
    label: "metrics wp",
    argv: ["metrics", "wp", "--game-id", "401752731"],
    command: "metrics wp",
    endpoint: "/metrics/wp",
    method: "winProbability",
    query: { gameId: 401752731 },
    resultKey: "win_probability",
  },
  {
    label: "metrics wp pregame",
    argv: [
      "metrics", "wp", "pregame", "--year", "2026", "--week", "0", "--team",
      "Florida State", "--season-type", "regular",
    ],
    command: "metrics wp pregame",
    endpoint: "/metrics/wp/pregame",
    method: "pregameWinProbabilities",
    query: { year: 2026, week: 0, team: "Florida State", seasonType: "regular" },
    resultKey: "pregame_win_probabilities",
  },
  {
    label: "metrics fg ep",
    argv: ["metrics", "fg", "ep"],
    command: "metrics fg ep",
    endpoint: "/metrics/fg/ep",
    method: "fieldGoalExpectedPoints",
    query: {},
    resultKey: "field_goal_expected_points",
  },
];

function createFixtureApi(calls: RecordedCall[]): StatisticsCfbdApi {
  const methods = {} as Record<keyof StatisticsCfbdApi, (...args: unknown[]) => Promise<unknown>>;

  for (const route of routeCases) {
    methods[route.method] = async (...args: unknown[]) => {
      calls.push({
        method: route.method,
        query: (args[0] ?? {}) as Record<string, unknown>,
      });

      if (route.method === "statCategories") return ["passing"];
      if (route.method === "playerSeasonOverview") {
        return { playerId: "4360248", displayName: "Test Player", nullable: null };
      }
      return [{ camelCaseField: "value", zero: 0, enabled: false, nullable: null }];
    };
  }

  return methods as unknown as StatisticsCfbdApi;
}

async function invoke(argv: readonly string[]): Promise<{
  calls: RecordedCall[];
  stdout: string;
}> {
  const calls: RecordedCall[] = [];
  let stdout = "";
  const runtime: CommandRuntime = {
    getApi: () => createFixtureApi(calls) as unknown as CfbdApi,
    io: {
      stdout: (value) => { stdout += value; },
      stderr: () => undefined,
    },
  };
  const program = new Command()
    .name("fbs")
    .exitOverride()
    .enablePositionalOptions();
  registerStatsCommand(program, runtime);
  registerPlayerCommand(program, runtime);
  registerPpaCommand(program, runtime);
  registerMetricsCommand(program, runtime);

  await program.parseAsync([...argv], { from: "user" });
  return { calls, stdout };
}

describe("statistics/player/PPA/metrics command routing", () => {
  test.each(routeCases)("$label maps every option and emits deterministic YAML", async (route) => {
    const result = await invoke(route.argv);
    expect(result.calls).toEqual([{ method: route.method, query: route.query }]);

    const output = parse(result.stdout);
    expect(output.command).toBe(route.command);
    expect(output.endpoint).toBe(route.endpoint);
    expect(output.count).toBe(1);
    expect(output).toHaveProperty(route.resultKey);
    expect(Object.keys(output).at(-1)).toBe(route.resultKey);
    expect(result.stdout.endsWith("\n")).toBe(true);
  });

  test("endpoint transformers snake-case recursively and retain falsey values", async () => {
    const output = parse((await invoke(["ppa", "teams", "--year", "2026"])).stdout);
    expect(output.team_ppa).toEqual([
      { camel_case_field: "value", zero: 0, enabled: false },
    ]);
  });
});

describe("statistics/player/PPA/metrics required filters", () => {
  const invalidCases: Array<[string, () => unknown, string]> = [
    ["player season stats", () => validatePlayerSeasonStatsQuery({}), "year is required"],
    ["season success", () => validatePlayerSeasonSuccessQuery({}), "year or playerId is required"],
    ["game success year", () => validatePlayerGameSuccessQuery({ week: 1 }), "year is required"],
    ["game success scope", () => validatePlayerGameSuccessQuery({ year: 2026 }), "week, team, or playerId is required"],
    ["team stats", () => validateTeamSeasonStatsQuery({}), "year or team is required"],
    ["havoc", () => validateGameHavocStatsQuery({}), "year or team is required"],
    ["player search", () => validatePlayerSearchQuery({}), "searchTerm is required"],
    ["season overview", () => validatePlayerSeasonOverviewQuery({ year: 2026 }), "year and playerId are required"],
    ["returning", () => validateReturningProductionQuery({}), "year or team is required"],
    ["portal", () => validateTransferPortalQuery({}), "year is required"],
    ["predicted points", () => validatePredictedPointsQuery({ down: 1 }), "down and distance are required"],
    ["team PPA", () => validateTeamPpaQuery({}), "year or team is required"],
    ["player game PPA", () => validatePlayerGamePpaQuery({ year: 2026 }), "week or team is required"],
    ["win probability", () => validateWinProbabilityQuery({}), "gameId is required"],
  ];

  test.each(invalidCases)("$0 rejects a missing required filter", (_label, operation, message) => {
    expect(operation).toThrow(message);
  });

  test("trims free-text filters and rejects blank required text", () => {
    expect(
      validatePlayerSearchQuery({
        searchTerm: " Travis ",
        team: " Florida State ",
        position: " QB ",
      }),
    ).toEqual({
      searchTerm: "Travis",
      team: "Florida State",
      position: "QB",
    });
    expect(() => validatePlayerSearchQuery({ searchTerm: "   " })).toThrow(
      "must not be blank",
    );
  });

  test("predicted points enforces the football down domain", () => {
    expect(() => validatePredictedPointsQuery({ down: 5, distance: 10 })).toThrow(
      "down: Too big",
    );
  });

  test("week ranges remain ordered", () => {
    expect(() =>
      validatePlayerSeasonStatsQuery({ year: 2026, startWeek: 8, endWeek: 2 }),
    ).toThrow("startWeek must be less than or equal to endWeek");
    expect(() =>
      validatePlayerSeasonSuccessQuery({
        year: 2026,
        startWeek: 8,
        endWeek: 2,
      }),
    ).toThrow("startWeek must be less than or equal to endWeek");
    expect(() =>
      validateTeamSeasonStatsQuery({ year: 2026, startWeek: 8, endWeek: 2 }),
    ).toThrow("startWeek must be less than or equal to endWeek");
  });
});

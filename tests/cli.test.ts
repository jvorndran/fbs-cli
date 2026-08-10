import { describe, expect, test } from "bun:test";
import type { Command } from "commander";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api.ts";
import { CfbdRequestError } from "../src/errors.ts";
import { createProgram, runCli } from "../src/index.ts";
import { snakeCaseDeep } from "../src/utils/snake-case.ts";
import { createMockApi, type RecordedApiCall } from "./helpers/mock-api.ts";

interface Invocation {
  exitCode: number;
  stdout: string;
  stderr: string;
  calls: RecordedApiCall[];
}

async function invokeWithMock(
  argv: readonly string[],
  overrides: Partial<CfbdApi> = {},
): Promise<Invocation> {
  const mock = await createMockApi(overrides);
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(argv, {
    api: mock.api,
    environment: {},
    io: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    },
  });

  return { exitCode, stdout, stderr, calls: mock.calls };
}

const routeCases: Array<{
  label: string;
  argv: readonly string[];
  command: string;
  endpoint: string;
  method: keyof CfbdApi;
  query: Record<string, unknown>;
  resultKey: string;
}> = [
  {
    label: "teams fbs",
    argv: ["teams", "fbs", "--year", "2026"],
    command: "teams fbs",
    endpoint: "/teams/fbs",
    method: "fbsTeams",
    query: { year: 2026 },
    resultKey: "teams",
  },
  {
    label: "games",
    argv: [
      "games",
      "--year",
      "2026",
      "--week",
      "0",
      "--season-type",
      "postseason",
      "--team",
      "Florida State",
      "--home",
      "Florida State",
      "--away",
      "Alabama",
      "--conference",
      "ACC",
      "--classification",
      "fbs",
      "--competition",
      "cfp",
      "--round",
      "semifinal",
    ],
    command: "games",
    endpoint: "/games",
    method: "games",
    query: {
      year: 2026,
      week: 0,
      seasonType: "postseason",
      team: "Florida State",
      home: "Florida State",
      away: "Alabama",
      conference: "ACC",
      classification: "fbs",
      competition: "cfp",
      round: "semifinal",
    },
    resultKey: "games",
  },
  {
    label: "roster",
    argv: [
      "roster",
      "--year",
      "2026",
      "--team",
      "Florida State",
      "--classification",
      "fbs",
    ],
    command: "roster",
    endpoint: "/roster",
    method: "roster",
    query: { year: 2026, team: "Florida State", classification: "fbs" },
    resultKey: "players",
  },
  {
    label: "info usage",
    argv: ["info", "usage", "--api", "cfb", "--days", "7", "--limit", "10"],
    command: "info usage",
    endpoint: "/info/usage",
    method: "usage",
    query: { api: "cfb", days: 7, limit: 10 },
    resultKey: "usage",
  },
  {
    label: "games teams",
    argv: [
      "games",
      "teams",
      "--year",
      "2026",
      "--week",
      "0",
      "--team",
      "Florida State",
      "--conference",
      "ACC",
      "--season-type",
      "regular",
      "--classification",
      "fbs",
    ],
    command: "games teams",
    endpoint: "/games/teams",
    method: "gameTeamStats",
    query: {
      year: 2026,
      week: 0,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
      classification: "fbs",
    },
    resultKey: "games",
  },
  {
    label: "games players",
    argv: [
      "games",
      "players",
      "--year",
      "2026",
      "--week",
      "0",
      "--team",
      "Florida State",
      "--conference",
      "ACC",
      "--category",
      "passing",
      "--season-type",
      "regular",
      "--classification",
      "fbs",
    ],
    command: "games players",
    endpoint: "/games/players",
    method: "gamePlayerStats",
    query: {
      year: 2026,
      week: 0,
      team: "Florida State",
      conference: "ACC",
      category: "passing",
      seasonType: "regular",
      classification: "fbs",
    },
    resultKey: "player_stats",
  },
  {
    label: "drives",
    argv: [
      "drives",
      "--year",
      "2026",
      "--week",
      "0",
      "--season-type",
      "regular",
      "--team",
      "Florida State",
      "--offense",
      "Florida State",
      "--defense",
      "Alabama",
      "--conference",
      "ACC",
      "--offense-conference",
      "ACC",
      "--defense-conference",
      "SEC",
      "--classification",
      "fbs",
    ],
    command: "drives",
    endpoint: "/drives",
    method: "drives",
    query: {
      year: 2026,
      week: 0,
      seasonType: "regular",
      team: "Florida State",
      offense: "Florida State",
      defense: "Alabama",
      conference: "ACC",
      offenseConference: "ACC",
      defenseConference: "SEC",
      classification: "fbs",
    },
    resultKey: "drives",
  },
  {
    label: "plays",
    argv: [
      "plays",
      "--year",
      "2026",
      "--week",
      "0",
      "--season-type",
      "regular",
      "--team",
      "Florida State",
      "--offense",
      "Florida State",
      "--defense",
      "Alabama",
      "--conference",
      "ACC",
      "--offense-conference",
      "ACC",
      "--defense-conference",
      "SEC",
      "--play-type",
      "Rush",
      "--classification",
      "fbs",
    ],
    command: "plays",
    endpoint: "/plays",
    method: "plays",
    query: {
      year: 2026,
      week: 0,
      seasonType: "regular",
      team: "Florida State",
      offense: "Florida State",
      defense: "Alabama",
      conference: "ACC",
      offenseConference: "ACC",
      defenseConference: "SEC",
      playType: "Rush",
      classification: "fbs",
    },
    resultKey: "plays",
  },
  {
    label: "plays stats",
    argv: [
      "plays",
      "stats",
      "--game-id",
      "401752731",
      "--athlete-id",
      "4433971",
      "--stat-type-id",
      "1",
      "--year",
      "2026",
      "--week",
      "0",
      "--team",
      "Florida State",
      "--conference",
      "ACC",
      "--season-type",
      "regular",
    ],
    command: "plays stats",
    endpoint: "/plays/stats",
    method: "playStats",
    query: {
      gameId: 401752731,
      athleteId: 4433971,
      statTypeId: 1,
      year: 2026,
      week: 0,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
    },
    resultKey: "play_stats",
  },
  {
    label: "stats game advanced",
    argv: [
      "stats",
      "game",
      "advanced",
      "--year",
      "2026",
      "--team",
      "Florida State",
      "--week",
      "0",
      "--opponent",
      "Alabama",
      "--season-type",
      "regular",
      "--exclude-garbage-time",
    ],
    command: "stats game advanced",
    endpoint: "/stats/game/advanced",
    method: "advancedGameStats",
    query: {
      year: 2026,
      team: "Florida State",
      week: 0,
      opponent: "Alabama",
      seasonType: "regular",
      excludeGarbageTime: true,
    },
    resultKey: "advanced_game_stats",
  },
  {
    label: "player usage",
    argv: [
      "player",
      "usage",
      "--year",
      "2026",
      "--team",
      "Florida State",
      "--conference",
      "ACC",
      "--player-id",
      "4433971",
      "--position",
      "QB",
      "--exclude-garbage-time",
    ],
    command: "player usage",
    endpoint: "/player/usage",
    method: "playerUsage",
    query: {
      year: 2026,
      team: "Florida State",
      conference: "ACC",
      playerId: 4433971,
      position: "QB",
      excludeGarbageTime: true,
    },
    resultKey: "player_usage",
  },
  {
    label: "stats season advanced",
    argv: [
      "stats",
      "season",
      "advanced",
      "--year",
      "2026",
      "--team",
      "Florida State",
      "--start-week",
      "0",
      "--end-week",
      "6",
      "--classification",
      "fbs",
      "--exclude-garbage-time",
    ],
    command: "stats season advanced",
    endpoint: "/stats/season/advanced",
    method: "advancedSeasonStats",
    query: {
      year: 2026,
      team: "Florida State",
      startWeek: 0,
      endWeek: 6,
      classification: "fbs",
      excludeGarbageTime: true,
    },
    resultKey: "advanced_season_stats",
  },
  {
    label: "games weather",
    argv: [
      "games",
      "weather",
      "--game-id",
      "401752731",
      "--year",
      "2026",
      "--week",
      "0",
      "--team",
      "Florida State",
      "--conference",
      "ACC",
      "--season-type",
      "regular",
      "--classification",
      "fbs",
    ],
    command: "games weather",
    endpoint: "/games/weather",
    method: "weather",
    query: {
      gameId: 401752731,
      year: 2026,
      week: 0,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
      classification: "fbs",
    },
    resultKey: "weather",
  },
];

describe("offline CLI routing", () => {
  test.each(routeCases)(
    "$label parses flags and invokes only its injected API method",
    async ({ argv, command, endpoint, method, query, resultKey }) => {
      const result = await invokeWithMock(argv);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.endsWith("\n")).toBe(true);
      expect(result.stdout).not.toMatch(/\u001b\[/);
      expect(result.calls).toEqual([{ method, query }]);

      const output = parse(result.stdout);
      expect(output.command).toBe(command);
      expect(output.endpoint).toBe(endpoint);
      expect(output.query).toEqual(snakeCaseDeep(query));
      expect(typeof output.count).toBe("number");
      expect(output).toHaveProperty(resultKey);
      expect(Object.keys(output).at(-1)).toBe(resultKey);
    },
  );

  test("games and games teams are distinct parent and nested actions", async () => {
    const parent = await invokeWithMock(["games", "--id", "401752731"]);
    const nested = await invokeWithMock([
      "games",
      "teams",
      "--id",
      "401752731",
    ]);

    expect(parent.calls).toEqual([
      { method: "games", query: { id: 401752731 } },
    ]);
    expect(nested.calls).toEqual([
      { method: "gameTeamStats", query: { id: 401752731 } },
    ]);
    expect(parse(parent.stdout).command).toBe("games");
    expect(parse(nested.stdout).command).toBe("games teams");
  });

  test("teams and teams ats are distinct actions and share parent filters safely", async () => {
    const parent = await invokeWithMock([
      "teams",
      "--year",
      "2024",
      "--conference",
      "ACC",
    ]);
    const nested = await invokeWithMock([
      "teams",
      "--year",
      "2024",
      "--conference",
      "ACC",
      "ats",
      "--team",
      "Florida State",
    ]);

    expect(parent.calls).toEqual([
      { method: "teams", query: { conference: "ACC", year: 2024 } },
    ]);
    expect(nested.calls).toEqual([
      {
        method: "teamAts",
        query: { conference: "ACC", team: "Florida State", year: 2024 },
      },
    ]);
    expect(parse(parent.stdout).command).toBe("teams");
    expect(parse(nested.stdout).command).toBe("teams ats");
  });

  test("plays and plays stats are distinct parent and nested actions", async () => {
    const parent = await invokeWithMock([
      "plays",
      "--year",
      "2026",
      "--week",
      "0",
    ]);
    const nested = await invokeWithMock([
      "plays",
      "stats",
      "--game-id",
      "401752731",
    ]);

    expect(parent.calls).toEqual([
      { method: "plays", query: { year: 2026, week: 0 } },
    ]);
    expect(nested.calls).toEqual([
      { method: "playStats", query: { gameId: 401752731 } },
    ]);
    expect(parse(parent.stdout).command).toBe("plays");
    expect(parse(nested.stdout).command).toBe("plays stats");
  });

  test.each([
    {
      label: "teams fbs",
      argv: ["teams", "--year", "2026", "--conference", "ACC", "fbs"],
      method: "fbsTeams",
      query: { year: 2026 },
    },
    {
      label: "teams ats",
      argv: ["teams", "--year", "2024", "--conference", "ACC", "ats", "--team", "Florida State"],
      method: "teamAts",
      query: { conference: "ACC", team: "Florida State", year: 2024 },
    },
    {
      label: "games teams",
      argv: ["games", "--year", "2026", "teams", "--week", "1"],
      method: "gameTeamStats",
      query: { week: 1, year: 2026 },
    },
    {
      label: "games players",
      argv: ["games", "--year", "2026", "players", "--team", "Florida State"],
      method: "gamePlayerStats",
      query: { team: "Florida State", year: 2026 },
    },
    {
      label: "games weather",
      argv: ["games", "--year", "2026", "--team", "Florida State", "weather", "--week", "1"],
      method: "weather",
      query: { team: "Florida State", week: 1, year: 2026 },
    },
    {
      label: "games media",
      argv: ["games", "--year", "2026", "media", "--media-type", "tv"],
      method: "media",
      query: { mediaType: "tv", year: 2026 },
    },
    {
      label: "plays stats",
      argv: ["plays", "--year", "2026", "--week", "1", "stats", "--athlete-id", "4433971"],
      method: "playStats",
      query: { athleteId: 4433971, week: 1, year: 2026 },
    },
    {
      label: "stats season advanced",
      argv: ["stats", "season", "--year", "2026", "--start-week", "1", "advanced", "--end-week", "6"],
      method: "advancedSeasonStats",
      query: { endWeek: 6, startWeek: 1, year: 2026 },
    },
    {
      label: "stats player success game",
      argv: ["stats", "player", "success", "--year", "2026", "--team", "Florida State", "--threshold", "10", "--exclude-garbage-time", "game", "--week", "1"],
      method: "playerGameSuccessRates",
      query: {
        excludeGarbageTime: true,
        team: "Florida State",
        threshold: 10,
        week: 1,
        year: 2026,
      },
    },
    {
      label: "ratings sp conferences",
      argv: ["ratings", "sp", "--year", "2025", "conferences", "--conference", "ACC"],
      method: "conferenceSpRatings",
      query: { conference: "ACC", year: 2025 },
    },
    {
      label: "ratings srs expanded",
      argv: ["ratings", "srs", "--team", "Florida State", "--conference", "ACC", "expanded", "--classification", "fbs"],
      method: "expandedSrsRatings",
      query: { classification: "fbs", conference: "ACC", team: "Florida State" },
    },
    {
      label: "playoffs cfp participants",
      argv: ["playoffs", "cfp", "--year", "2025", "participants"],
      method: "cfpParticipants",
      query: { year: 2025 },
    },
    {
      label: "playoffs cfp games",
      argv: ["playoffs", "cfp", "--year", "2025", "games", "--round", "semifinal"],
      method: "cfpGames",
      query: { round: "semifinal", year: 2025 },
    },
    {
      label: "coaches seasons",
      argv: ["coaches", "--team", "Florida State", "--min-year", "1976", "seasons", "--max-year", "2009"],
      method: "coachSeasons",
      query: { maxYear: 2009, minYear: 1976, team: "Florida State" },
    },
    {
      label: "coaches tenures",
      argv: ["coaches", "--team", "Florida State", "--year", "2025", "tenures", "--active", "true"],
      method: "coachTenures",
      query: { active: true, team: "Florida State", year: 2025 },
    },
  ])("$label inherits supported parent options", async ({ argv, method, query }) => {
    const result = await invokeWithMock(argv);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ method, query }]);
  });

  test("an explicitly supplied leaf option wins over the same parent option", async () => {
    const result = await invokeWithMock([
      "games",
      "--year",
      "2025",
      "teams",
      "--year",
      "2026",
      "--week",
      "1",
    ]);

    expect(result.calls).toEqual([
      { method: "gameTeamStats", query: { week: 1, year: 2026 } },
    ]);
  });

  test("records local filters without contaminating the CFBD query", async () => {
    const result = await invokeWithMock([
      "games",
      "--year",
      "2026",
      "--completed",
      "false",
    ]);

    expect(result.calls).toEqual([{ method: "games", query: { year: 2026 } }]);
    expect(parse(result.stdout)).toMatchObject({
      query: { year: 2026 },
      filters: { completed: false },
      count: 1,
      games: [{ id: 401752732, completed: false }],
    });
  });

  test("omits an optional boolean when its flag is not supplied", async () => {
    const result = await invokeWithMock([
      "stats",
      "game",
      "advanced",
      "--year",
      "2026",
    ]);

    expect(result.calls).toEqual([
      { method: "advancedGameStats", query: { year: 2026 } },
    ]);
    expect(parse(result.stdout).query).toEqual({ year: 2026 });
  });
});

describe("offline CLI failures", () => {
  test("missing API key fails before any network-capable API is constructed", async () => {
    let stdout = "";
    let stderr = "";
    const exitCode = await runCli(["games", "--year", "2026"], {
      environment: {},
      environmentFile: `${import.meta.dir}/fixtures/.missing-api-key-env`,
      io: {
        stdout: (value) => {
          stdout += value;
        },
        stderr: (value) => {
          stderr += value;
        },
      },
    });

    expect(exitCode).toBe(2);
    expect(stdout).toBe("");
    expect(parse(stderr)).toEqual({
      error: {
        code: "missing_api_key",
        message: "CFBD_API_KEY is required.",
        hint: "Set CFBD_API_KEY or run fbs auth to create .env in the current directory.",
      },
    });
  });

  test("validation failure is YAML on stderr and never invokes the API", async () => {
    const result = await invokeWithMock(["games", "--team", "Florida State"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toEqual([]);
    expect(parse(result.stderr)).toEqual({
      error: {
        code: "invalid_query",
        message: "year is required when id is not specified",
        command: "games",
        query: { team: "Florida State" },
        hint: "Supply --year or query a game with --id.",
      },
    });
  });

  test("trims free-text flags before calling the API", async () => {
    const result = await invokeWithMock([
      "games",
      "--year",
      "2026",
      "--team",
      "  Florida State  ",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.calls).toEqual([
      { method: "games", query: { team: "Florida State", year: 2026 } },
    ]);
    expect(parse(result.stdout).query).toEqual({
      team: "Florida State",
      year: 2026,
    });
  });

  test("rejects whitespace-only free-text flags before calling the API", async () => {
    const result = await invokeWithMock([
      "player",
      "search",
      "--search-term",
      "   ",
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toEqual([]);
    expect(parse(result.stderr)).toMatchObject({
      error: {
        code: "invalid_query",
        command: "player search",
      },
    });
    expect(parse(result.stderr).error.message).toContain("must not be blank");
  });

  test("historical betting routes enforce their conditional year filters", async () => {
    const lines = await invokeWithMock(["lines", "--provider", "consensus"]);
    const ats = await invokeWithMock(["teams", "ats", "--team", "Florida State"]);

    expect(lines.exitCode).toBe(2);
    expect(lines.stdout).toBe("");
    expect(lines.calls).toEqual([]);
    expect(parse(lines.stderr)).toEqual({
      error: {
        code: "invalid_query",
        message: "year is required when gameId is not specified",
        command: "lines",
        query: { provider: "consensus" },
        hint: "Supply --year or query one game with --game-id.",
      },
    });

    expect(ats.exitCode).toBe(2);
    expect(ats.stdout).toBe("");
    expect(ats.calls).toEqual([]);
    expect(parse(ats.stderr)).toEqual({
      error: {
        code: "invalid_query",
        message: "year is required",
        command: "teams ats",
        query: { team: "Florida State" },
        hint: "Supply --year.",
      },
    });
  });

  test("Commander parse failures are normalized as YAML with exit code 2", async () => {
    const result = await invokeWithMock(["games", "--year", "not-a-number"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toEqual([]);
    expect(parse(result.stderr)).toMatchObject({
      error: {
        code: "cli_parse_error",
        hint: "Run fbs --help or fbs <command> --help to inspect valid arguments.",
      },
    });
    expect(parse(result.stderr).error.message).toContain("Expected an integer");
    expect(result.stderr).not.toContain("Usage:");
  });

  test.each([
    ["teams matchup", ["teams", "--year", "2026", "matchup", "--team1", "Florida State", "--team2", "Miami"]],
    ["games teams", ["games", "--home", "Florida State", "teams", "--year", "2026", "--week", "1"]],
    ["games players", ["games", "--away", "Miami", "players", "--year", "2026", "--week", "1"]],
    ["games weather", ["games", "--id", "401752731", "weather", "--year", "2026"]],
    ["games media", ["games", "--competition", "cfp", "media", "--year", "2026"]],
    ["plays stats", ["plays", "--offense", "Florida State", "stats"]],
    ["plays types", ["plays", "--year", "2026", "types"]],
    ["plays stats types", ["plays", "stats", "--game-id", "401752731", "types"]],
    ["stats season advanced", ["stats", "season", "--conference", "ACC", "advanced", "--year", "2026"]],
    ["stats player success game", ["stats", "player", "success", "--start-week", "1", "game", "--year", "2026", "--week", "1"]],
    ["metrics wp pregame", ["metrics", "wp", "--game-id", "401752731", "pregame"]],
    ["ratings sp conferences", ["ratings", "sp", "--team", "Florida State", "conferences"]],
    ["coaches profile", ["coaches", "--team", "Florida State", "profile", "--coach-id", "123"]],
    ["coaches seasons", ["coaches", "--first-name", "Bobby", "seasons"]],
    ["coaches tenures", ["coaches", "--max-year", "2009", "tenures"]],
  ])("rejects an unsupported parent option for %s", async (command, argv) => {
    const result = await invokeWithMock(argv);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toEqual([]);
    expect(parse(result.stderr)).toMatchObject({
      error: {
        code: "cli_parse_error",
        command,
      },
    });
    expect(parse(result.stderr).error.message).toContain("is not supported");
  });

  test("provider/tier errors preserve context, keep stdout empty, and redact keys", async () => {
    const secret = "never-render-this-key";
    const result = await invokeWithMock(
      ["games", "weather", "--game-id", "401752731"],
      {
        weather: async () => {
          throw new CfbdRequestError({
            code: "cfbd_forbidden",
            status: 403,
            message: `Tier denied for Bearer ${secret}`,
            hint: "Your CFBD subscription tier may not authorize this endpoint.",
          });
        },
      },
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain(secret);
    expect(parse(result.stderr)).toEqual({
      error: {
        code: "cfbd_forbidden",
        status: 403,
        message: "Tier denied for Bearer [REDACTED]",
        command: "games weather",
        query: { game_id: 401752731 },
        hint: "Your CFBD subscription tier may not authorize this endpoint.",
      },
    });
  });
});

function findCommand(program: Command, path: readonly string[]): Command {
  let current = program;

  for (const name of path) {
    const next = current.commands.find((candidate) => candidate.name() === name);
    if (next === undefined) {
      throw new Error(`Missing command path: ${path.join(" ")}`);
    }
    current = next;
  }

  return current;
}

describe("help surface", () => {
  test("root help lists every first-level resource", async () => {
    const mock = await createMockApi();
    const help = createProgram({ api: mock.api }).helpInformation();

    for (const resource of [
      "teams",
      "games",
      "roster",
      "info",
      "drives",
      "plays",
      "stats",
      "player",
      "conferences",
      "talent",
      "venues",
      "records",
      "calendar",
      "scoreboard",
      "lines",
      "ppa",
      "metrics",
      "wepa",
      "recruiting",
      "ratings",
      "rankings",
      "playoffs",
      "live",
      "draft",
      "coaches",
      "game",
    ]) {
      expect(help).toContain(resource);
    }
    expect(mock.calls).toEqual([]);
  });

  const helpCases: Array<{
    path: readonly string[];
    flags: readonly string[];
  }> = [
    { path: ["teams", "fbs"], flags: ["--year"] },
    { path: ["teams", "ats"], flags: ["--year", "--team", "--conference"] },
    {
      path: ["lines"],
      flags: [
        "--game-id",
        "--year",
        "--season-type",
        "--week",
        "--team",
        "--home",
        "--away",
        "--conference",
        "--provider",
      ],
    },
    {
      path: ["games"],
      flags: [
        "--id",
        "--year",
        "--week",
        "--season-type",
        "--team",
        "--home",
        "--away",
        "--conference",
        "--classification",
        "--competition",
        "--round",
      ],
    },
    { path: ["roster"], flags: ["--year", "--team", "--classification"] },
    { path: ["info", "usage"], flags: ["--api", "--days", "--limit"] },
    {
      path: ["games", "teams"],
      flags: [
        "--id",
        "--year",
        "--week",
        "--team",
        "--conference",
        "--season-type",
        "--classification",
      ],
    },
    {
      path: ["games", "players"],
      flags: [
        "--id",
        "--year",
        "--week",
        "--team",
        "--conference",
        "--category",
        "--season-type",
        "--classification",
      ],
    },
    {
      path: ["drives"],
      flags: [
        "--year",
        "--week",
        "--season-type",
        "--team",
        "--offense",
        "--defense",
        "--conference",
        "--offense-conference",
        "--defense-conference",
        "--classification",
      ],
    },
    {
      path: ["plays"],
      flags: [
        "--year",
        "--week",
        "--season-type",
        "--team",
        "--offense",
        "--defense",
        "--conference",
        "--offense-conference",
        "--defense-conference",
        "--play-type",
        "--classification",
      ],
    },
    {
      path: ["plays", "stats"],
      flags: [
        "--game-id",
        "--athlete-id",
        "--stat-type-id",
        "--year",
        "--week",
        "--team",
        "--conference",
        "--season-type",
      ],
    },
    {
      path: ["stats", "game", "advanced"],
      flags: [
        "--year",
        "--team",
        "--week",
        "--opponent",
        "--season-type",
        "--exclude-garbage-time",
      ],
    },
    {
      path: ["player", "usage"],
      flags: [
        "--year",
        "--team",
        "--conference",
        "--player-id",
        "--position",
        "--exclude-garbage-time",
      ],
    },
    {
      path: ["stats", "season", "advanced"],
      flags: [
        "--year",
        "--team",
        "--start-week",
        "--end-week",
        "--classification",
        "--exclude-garbage-time",
      ],
    },
    {
      path: ["games", "weather"],
      flags: [
        "--game-id",
        "--year",
        "--week",
        "--team",
        "--conference",
        "--season-type",
        "--classification",
      ],
    },
  ];

  test.each(helpCases)("$path advertises every supported flag", async ({ path, flags }) => {
    const mock = await createMockApi();
    const program = createProgram({ api: mock.api });
    const help = findCommand(program, path).helpInformation();

    for (const flag of flags) {
      expect(help).toContain(flag);
    }
    expect(help).toContain("--help");
    expect(mock.calls).toEqual([]);
  });

  test("--help parses successfully without requiring an API key", async () => {
    let stdout = "";
    let stderr = "";
    const exitCode = await runCli(["games", "weather", "--help"], {
      environment: {},
      io: {
        stdout: (value) => {
          stdout += value;
        },
        stderr: (value) => {
          stderr += value;
        },
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: fbs games weather");
    expect(stdout).toContain("--game-id");
    expect(stderr).toBe("");
  });

  test.each([
    { argv: ["stats"] },
    { argv: ["stats", "game"] },
    { argv: ["player"] },
  ] as const)("group-only invocation $argv shows help cleanly", async ({ argv }) => {
    const result = await invokeWithMock(argv);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([]);
    expect(result.stdout).toContain(`Usage: fbs ${argv.join(" ")}`);
    expect(result.stdout).toContain("Commands:");
  });
});

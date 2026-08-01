import { beforeAll, describe, expect, test } from "bun:test";
import { parse } from "yaml";

import { runCli as executeCli } from "../../src/index.ts";

const liveEnabled = process.env.CFBD_LIVE_TESTS === "1";

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface LiveCase {
  args: readonly string[];
  command: string;
  endpoint: string;
  resultKey: string;
  allowTierDenial?: boolean;
}

interface SuccessEnvelope extends Record<string, unknown> {
  command: string;
  endpoint: string;
  query: Record<string, unknown>;
  count: number;
}

async function runCli(args: readonly string[]): Promise<CliResult> {
  let stdout = "";
  let stderr = "";

  const exitCode = await executeCli(args, {
    environment: process.env,
    io: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
    },
  });

  return { exitCode, stdout, stderr };
}

function parseYamlObject(value: string): Record<string, unknown> {
  const parsed: unknown = parse(value);
  expect(parsed).toEqual(expect.any(Object));
  return parsed as Record<string, unknown>;
}

async function expectStructuredSuccess(liveCase: LiveCase): Promise<SuccessEnvelope> {
  const result = await runCli(liveCase.args);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const output = parseYamlObject(result.stdout) as SuccessEnvelope;
  expect(output.command).toBe(liveCase.command);
  expect(output.endpoint).toBe(liveCase.endpoint);
  expect(output.query).toEqual(expect.any(Object));
  expect(typeof output.count).toBe("number");
  expect(output).toHaveProperty(liveCase.resultKey);

  return output;
}

async function expectSuccessOrTierDenial(liveCase: LiveCase): Promise<void> {
  const result = await runCli(liveCase.args);

  if (result.exitCode === 0) {
    expect(result.stderr).toBe("");
    const output = parseYamlObject(result.stdout);
    expect(output).toMatchObject({
      command: liveCase.command,
      endpoint: liveCase.endpoint,
      query: expect.any(Object),
      count: expect.any(Number),
    });
    expect(output).toHaveProperty(liveCase.resultKey);
    return;
  }

  expect(result.stdout).toBe("");
  expect(result.exitCode).not.toBe(0);

  const failureDocument = parseYamlObject(result.stderr);
  expect(failureDocument).toHaveProperty("error");
  const failure = failureDocument.error as Record<string, unknown>;
  expect(typeof failure.code).toBe("string");
  expect(typeof failure.status).toBe("number");
  expect(typeof failure.hint).toBe("string");
  const code = failure.code as string;
  const status = failure.status as number;
  const hint = failure.hint as string;
  expect(["cfbd_unauthorized", "cfbd_forbidden"]).toContain(code);
  expect([401, 403]).toContain(status);
  expect(failure.command).toBe(liveCase.command);
  expect(failure.query).toEqual(expect.any(Object));
  expect([
    "This endpoint requires a higher CFBD subscription tier.",
    "Your CFBD subscription tier may not authorize this endpoint.",
  ]).toContain(hint);
}

// Exhaustive route behavior remains in the offline suite. This representative
// live matrix covers each new implementation family without spending quota on
// all 58 added endpoints. A complete enabled run makes exactly 22 API calls:
// 18 representative calls, one /games lookup, and three tier-sensitive calls.
const discoveryAndStatisticsCases: readonly LiveCase[] = [
  {
    args: ["info"],
    command: "info",
    endpoint: "/info",
    resultKey: "info",
  },
  {
    args: ["conferences"],
    command: "conferences",
    endpoint: "/conferences",
    resultKey: "conferences",
  },
  {
    args: ["teams", "--conference", "ACC", "--year", "2024"],
    command: "teams",
    endpoint: "/teams",
    resultKey: "teams",
  },
  {
    args: [
      "games",
      "media",
      "--year",
      "2024",
      "--week",
      "1",
      "--team",
      "Florida State",
    ],
    command: "games media",
    endpoint: "/games/media",
    resultKey: "media",
  },
  {
    args: ["plays", "types"],
    command: "plays types",
    endpoint: "/plays/types",
    resultKey: "play_types",
  },
  {
    args: ["stats", "categories"],
    command: "stats categories",
    endpoint: "/stats/categories",
    resultKey: "categories",
  },
  {
    args: [
      "player",
      "search",
      "--search-term",
      "Jordan Travis",
      "--year",
      "2023",
      "--team",
      "Florida State",
    ],
    command: "player search",
    endpoint: "/player/search",
    resultKey: "players",
  },
  {
    args: ["ppa", "predicted", "--down", "1", "--distance", "10"],
    command: "ppa predicted",
    endpoint: "/ppa/predicted",
    resultKey: "predicted_points",
    allowTierDenial: true,
  },
  {
    args: ["metrics", "fg", "ep"],
    command: "metrics fg ep",
    endpoint: "/metrics/fg/ep",
    resultKey: "field_goal_expected_points",
    allowTierDenial: true,
  },
];

const historicalAnalyticsCases: readonly LiveCase[] = [
  {
    args: ["lines", "--year", "2024", "--week", "1", "--team", "Florida State"],
    command: "lines",
    endpoint: "/lines",
    resultKey: "lines",
    allowTierDenial: true,
  },
  {
    args: ["teams", "ats", "--year", "2024", "--team", "Florida State"],
    command: "teams ats",
    endpoint: "/teams/ats",
    resultKey: "team_ats",
    allowTierDenial: true,
  },
  {
    args: ["wepa", "team", "season", "--year", "2024", "--team", "Florida State"],
    command: "wepa team season",
    endpoint: "/wepa/team/season",
    resultKey: "team_metrics",
    allowTierDenial: true,
  },
  {
    args: ["recruiting", "teams", "--year", "2024", "--team", "Florida State"],
    command: "recruiting teams",
    endpoint: "/recruiting/teams",
    resultKey: "team_rankings",
    allowTierDenial: true,
  },
  {
    args: ["ratings", "sp", "--year", "2024", "--team", "Florida State"],
    command: "ratings sp",
    endpoint: "/ratings/sp",
    resultKey: "sp_ratings",
    allowTierDenial: true,
  },
  {
    args: ["rankings", "--year", "2024", "--week", "1"],
    command: "rankings",
    endpoint: "/rankings",
    resultKey: "rankings",
    allowTierDenial: true,
  },
  {
    args: ["playoffs", "cfp", "participants", "--year", "2024"],
    command: "playoffs cfp participants",
    endpoint: "/playoffs/cfp/participants",
    resultKey: "participants",
    allowTierDenial: true,
  },
  {
    args: ["draft", "picks", "--year", "2024", "--school", "Florida State"],
    command: "draft picks",
    endpoint: "/draft/picks",
    resultKey: "draft_picks",
    allowTierDenial: true,
  },
  {
    args: ["coaches", "--year", "2024", "--team", "Florida State"],
    command: "coaches",
    endpoint: "/coaches",
    resultKey: "coaches",
    allowTierDenial: true,
  },
];

if (!liveEnabled) {
  test.skip(
    "extended live CFBD endpoint smoke tests require CFBD_LIVE_TESTS=1 (22 API calls)",
    () => {},
  );
} else {
  describe("extended live CFBD endpoint smoke tests (22 API calls)", () => {
    beforeAll(() => {
      if (!process.env.CFBD_API_KEY?.trim()) {
        throw new Error(
          "CFBD_API_KEY is required when CFBD_LIVE_TESTS=1. Supply the key before running this suite.",
        );
      }
    });

    test("samples discovery, metadata, statistics, PPA, and metrics endpoints (9 calls)", async () => {
      for (const liveCase of discoveryAndStatisticsCases) {
        if (liveCase.allowTierDenial) {
          await expectSuccessOrTierDenial(liveCase);
        } else {
          await expectStructuredSuccess(liveCase);
        }
      }
    });

    test("samples betting, WEPA, recruiting, ratings, rankings, playoffs, draft, and coaches (9 calls)", async () => {
      for (const liveCase of historicalAnalyticsCases) {
        await expectSuccessOrTierDenial(liveCase);
      }
    });

    test("discovers a completed game and checks explicitly tier-sensitive routes (4 calls)", async () => {
      const games = await expectStructuredSuccess({
        args: [
          "games",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        command: "games",
        endpoint: "/games",
        resultKey: "games",
      });

      expect(Array.isArray(games.games)).toBe(true);
      const firstGame = (games.games as Array<Record<string, unknown>>)[0];
      expect(firstGame).toEqual(expect.any(Object));
      expect(typeof firstGame?.id).toBe("number");
      const gameId = String(firstGame?.id);

      const tierSensitiveCases: readonly LiveCase[] = [
        {
          args: ["scoreboard", "--classification", "fbs"],
          command: "scoreboard",
          endpoint: "/scoreboard",
          resultKey: "scoreboard",
        },
        {
          args: ["game", "box", "advanced", "--id", gameId],
          command: "game box advanced",
          endpoint: "/game/box/advanced",
          resultKey: "box_score",
        },
        {
          args: ["live", "plays", "--game-id", gameId],
          command: "live plays",
          endpoint: "/live/plays",
          resultKey: "live_game",
        },
      ];

      for (const liveCase of tierSensitiveCases) {
        await expectSuccessOrTierDenial(liveCase);
      }
    });
  });
}

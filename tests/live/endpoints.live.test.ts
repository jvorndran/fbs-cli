import { beforeAll, describe, expect, test } from "bun:test";
import { parse } from "yaml";

const liveEnabled = process.env.CFBD_LIVE_TESTS === "1";
const workspace = `${import.meta.dir}/../..`;

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function invoke(args: readonly string[]): Promise<CliResult> {
  const child = Bun.spawn([process.execPath, "run", "src/cli.ts", ...args], {
    cwd: workspace,
    env: {
      ...process.env,
      CFBD_API_KEY: process.env.CFBD_API_KEY ?? "",
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

if (!liveEnabled) {
  test.skip("live CFBD endpoint smoke tests require CFBD_LIVE_TESTS=1", () => {});
} else {
  describe("live CFBD endpoint smoke tests", () => {
    beforeAll(() => {
      if (!process.env.CFBD_API_KEY?.trim()) {
        throw new Error(
          "CFBD_API_KEY is required when CFBD_LIVE_TESTS=1. Supply the key before running this suite.",
        );
      }
    });

    const cases: Array<{
      command: string[];
      endpoint: string;
      resultKey: string;
    }> = [
      {
        command: ["teams", "fbs", "--year", "2024"],
        endpoint: "/teams/fbs",
        resultKey: "teams",
      },
      {
        command: [
          "games",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        endpoint: "/games",
        resultKey: "games",
      },
      {
        command: [
          "roster",
          "--year",
          "2024",
          "--team",
          "Florida State",
        ],
        endpoint: "/roster",
        resultKey: "players",
      },
      {
        command: ["info", "usage", "--api", "cfb", "--days", "1", "--limit", "1"],
        endpoint: "/info/usage",
        resultKey: "usage",
      },
      {
        command: [
          "games",
          "teams",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        endpoint: "/games/teams",
        resultKey: "games",
      },
      {
        command: [
          "games",
          "players",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
          "--category",
          "passing",
        ],
        endpoint: "/games/players",
        resultKey: "player_stats",
      },
      {
        command: [
          "drives",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        endpoint: "/drives",
        resultKey: "drives",
      },
      {
        command: [
          "plays",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        endpoint: "/plays",
        resultKey: "plays",
      },
      {
        command: [
          "plays",
          "stats",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
        ],
        endpoint: "/plays/stats",
        resultKey: "play_stats",
      },
      {
        command: [
          "stats",
          "game",
          "advanced",
          "--year",
          "2024",
          "--week",
          "1",
          "--team",
          "Florida State",
          "--exclude-garbage-time",
        ],
        endpoint: "/stats/game/advanced",
        resultKey: "advanced_game_stats",
      },
      {
        command: [
          "player",
          "usage",
          "--year",
          "2024",
          "--team",
          "Florida State",
          "--exclude-garbage-time",
        ],
        endpoint: "/player/usage",
        resultKey: "player_usage",
      },
      {
        command: [
          "stats",
          "season",
          "advanced",
          "--year",
          "2024",
          "--team",
          "Florida State",
          "--start-week",
          "1",
          "--end-week",
          "1",
        ],
        endpoint: "/stats/season/advanced",
        resultKey: "advanced_season_stats",
      },
    ];

    test.each(cases)("$endpoint returns a structured success envelope", async ({
      command,
      endpoint,
      resultKey,
    }) => {
      const result = await invoke(command);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      const output = parse(result.stdout);
      expect(output).toMatchObject({ endpoint });
      const firstFlag = command.findIndex((part) => part.startsWith("--"));
      expect(output.command).toBe(command.slice(0, firstFlag).join(" "));
      expect(output.query).toEqual(expect.any(Object));
      expect(typeof output.count).toBe("number");
      expect(output).toHaveProperty(resultKey);
    });

    test("/games/weather succeeds or reports a structured subscription-tier error", async () => {
      const result = await invoke([
        "games",
        "weather",
        "--year",
        "2024",
        "--week",
        "1",
        "--team",
        "Florida State",
      ]);

      if (result.exitCode === 0) {
        expect(result.stderr).toBe("");
        expect(parse(result.stdout)).toMatchObject({
          command: "games weather",
          endpoint: "/games/weather",
        });
        expect(parse(result.stdout)).toHaveProperty("weather");
        return;
      }

      expect(result.stdout).toBe("");
      expect(result.exitCode).not.toBe(0);
      const failure = parse(result.stderr).error;
      expect(["cfbd_unauthorized", "cfbd_forbidden"]).toContain(failure.code);
      expect([401, 403]).toContain(failure.status);
      expect(failure.command).toBe("games weather");
      expect(failure.hint).toBe(
        "This endpoint requires a higher CFBD subscription tier.",
      );
    });
  });
}

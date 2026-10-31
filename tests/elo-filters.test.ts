import { describe, expect, test } from "bun:test";
import type { TeamElo } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamElo[] = [
  { year: 2026, team: "First", conference: "ACC", elo: 1700.125 },
  { year: 2026, team: "Second", conference: "ACC", elo: 1700.125 },
  { year: 2026, team: "Zero", conference: "ACC", elo: 0 },
  { year: 2026, team: "Negative", conference: "ACC", elo: -0.125 },
  { year: 2026, team: "Missing", conference: "ACC", elo: null },
];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async eloRatings(query) { requests.push(query); return rows; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["ratings", "elo", ...flags], {
    api: mock.api, environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("Elo rating cohorts", () => {
  test("combines inclusive bounds with every provider scope without leaking filters", async () => {
    const result = await invoke([
      "--year", "2026", "--week", "0", "--team", "First", "--conference", "ACC",
      "--season-type", "regular", "--min-elo", "1700.125", "--max-elo", "1700.125",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const query = { year: 2026, week: 0, team: "First", conference: "ACC", seasonType: "regular" };
    expect(result.requests).toEqual([query]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026, week: 0, team: "First", conference: "ACC", season_type: "regular" });
    expect(output.filters).toEqual({ min_elo: 1700.125, max_elo: 1700.125 });
    expect(output.elo_ratings).toEqual(rows.slice(0, 2));
    expect(output.count).toBe(2);
  });

  for (const [flags, teams] of [
    [["--min-elo", "1700.125"], ["First", "Second"]],
    [["--max-elo", "0"], ["Zero", "Negative"]],
    [["--min-elo", "0", "--max-elo", "0"], ["Zero"]],
    [["--min-elo", "2000"], []],
    [["--max-elo=-0.125"], ["Negative"]],
  ] as const) {
    test(`supports ${flags.join(" ")} with original order and no required year`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{}]);
      const output = parse(result.stdout);
      expect(output.elo_ratings.map((row: TeamElo) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
    });
  }

  test("unfiltered output retains unavailable values and has no filters", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.elo_ratings).toEqual(rows.map(({ elo, ...row }) => elo === null ? row : { ...row, elo }));
    expect(output.filters).toBeUndefined();
    expect(output.count).toBe(5);
  });

  for (const flags of [
    ["--min-elo", "2", "--max-elo", "1"],
    ["--min-elo", "NaN"], ["--max-elo", "Infinity"],
    ["--min-elo", " "], ["--max-elo", "bad"],
  ]) {
    test(`rejects ${flags.join(" ")} before requesting`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
      expect(["cli_parse_error", "invalid_query"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("help labels both bounds as local inclusive filters", () => {
    const ratings = createProgram().commands.find((command) => command.name() === "ratings")!;
    const elo = ratings.commands.find((command) => command.name() === "elo")!;
    expect(elo.helpInformation()).toContain("--min-elo");
    expect(elo.helpInformation()).toContain("--max-elo");
    expect(elo.helpInformation()).toContain("Local filter: minimum Elo (inclusive)");
  });
});

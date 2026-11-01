import { describe, expect, test } from "bun:test";
import type { TeamFPI } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamFPI[] = [
  { year: 2026, team: "First", conference: "ACC", fpi: 1700.125 },
  { year: 2026, team: "Second", conference: "ACC", fpi: 1700.125 },
  { year: 2026, team: "Zero", conference: "ACC", fpi: 0 },
  { year: 2026, team: "Negative", conference: "ACC", fpi: -0.125 },
  { year: 2026, team: "Missing", conference: "ACC", fpi: null },
].map((row) => ({ ...row, resumeRanks: { gameControl: null, remainingStrengthOfSchedule: null, strengthOfSchedule: null, averageWinProbability: null, fpi: 99, strengthOfRecord: null }, efficiencies: { specialTeams: null, defense: null, offense: null, overall: null } }));

async function invoke(flags: readonly string[], includeYear = true) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async fpiRatings(query) { requests.push(query); return rows; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["ratings", "fpi", ...(includeYear ? ["--year", "2026"] : []), ...flags], {
    api: mock.api, environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("FPI rating cohorts", () => {
  test("bounds retain the required year-or-team scope", async () => {
    const missing = await invoke(["--min-fpi", "0"], false);
    expect(missing.exitCode).toBe(2);
    expect(missing.stdout).toBe("");
    expect(missing.requests).toEqual([]);
    const team = await invoke(["--team", "First", "--min-fpi", "0"], false);
    expect(team.exitCode).toBe(0);
    expect(team.requests).toEqual([{ team: "First" }]);
  });
  test("combines inclusive bounds with every provider scope without leaking filters", async () => {
    const result = await invoke([
      "--year", "2026", "--team", "First", "--conference", "ACC",
      "--min-fpi", "1700.125", "--max-fpi", "1700.125",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const query = { year: 2026, team: "First", conference: "ACC" };
    expect(result.requests).toEqual([query]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026, team: "First", conference: "ACC" });
    expect(output.filters).toEqual({ min_fpi: 1700.125, max_fpi: 1700.125 });
    expect(output.fpi_ratings.map((row: TeamFPI) => [row.team, row.fpi])).toEqual([["First", 1700.125], ["Second", 1700.125]]);
    expect(output.fpi_ratings[0].resume_ranks.fpi).toBe(99);
    expect(output.count).toBe(2);
  });

  for (const [flags, teams] of [
    [["--min-fpi", "1700.125"], ["First", "Second"]],
    [["--max-fpi", "0"], ["Zero", "Negative"]],
    [["--min-fpi", "0", "--max-fpi", "0"], ["Zero"]],
    [["--min-fpi", "2000"], []],
    [["--max-fpi=-0.125"], ["Negative"]],
  ] as const) {
    test(`supports ${flags.join(" ")} with original order`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{year: 2026}]);
      const output = parse(result.stdout);
      expect(output.fpi_ratings.map((row: TeamFPI) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
    });
  }

  test("unfiltered output retains unavailable values and has no filters", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.fpi_ratings[4].fpi).toBeUndefined();
    expect(output.fpi_ratings[4].resume_ranks.fpi).toBe(99);
    expect(output.fpi_ratings[4].efficiencies).toEqual({});
    expect(output.filters).toBeUndefined();
    expect(output.count).toBe(5);
  });

  for (const flags of [
    ["--min-fpi", "2", "--max-fpi", "1"],
    ["--min-fpi", "NaN"], ["--max-fpi", "Infinity"],
    ["--min-fpi", " "], ["--max-fpi", "bad"],
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
    const fpi = ratings.commands.find((command) => command.name() === "fpi")!;
    expect(fpi.helpInformation()).toContain("--min-fpi");
    expect(fpi.helpInformation()).toContain("--max-fpi");
    expect(fpi.helpInformation()).toContain("Local filter: minimum FPI (inclusive)");
  });
});

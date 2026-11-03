import { describe, expect, test } from "bun:test";
import type { TeamSP } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamSP[] = [
  ["First", 20.125], ["Second", 20.125], ["Zero", 0], ["Negative", -0.125],
].map(([team, rating]) => ({
  year: 2026, team: String(team), conference: "ACC", rating: Number(rating), ranking: 42,
  secondOrderWins: null, sos: null,
  offense: { pace: null, runRate: null, passingDowns: null, standardDowns: null,
    passing: null, rushing: null, explosiveness: null, success: null, rating: 30, ranking: 17 },
  defense: { havoc: { db: null, frontSeven: null, total: null }, passingDowns: null,
    standardDowns: null, passing: null, rushing: null, explosiveness: null, success: null,
    rating: 10, ranking: 28 },
  specialTeams: { rating: 0 },
}));

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async spRatings(query) { requests.push(query); return rows; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["ratings", "sp", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("SP+ rating cohorts", () => {
  test("inclusive bounds preserve national ranks and the year/team request contract", async () => {
    const result = await invoke(["--year", "2026", "--team", "first",
      "--min-rating", "20.125", "--max-rating", "20.125"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026, team: "first" });
    expect(output.filters).toEqual({ min_rating: 20.125, max_rating: 20.125 });
    expect(output.count).toBe(1);
    expect(output.sp_ratings[0]).toMatchObject({ team: "First", rating: 20.125, ranking: 42,
      offense: { rating: 30, ranking: 17 }, defense: { rating: 10, ranking: 28 } });
  });

  for (const [flags, teams] of [
    [["--min-rating", "20.125"], ["First", "Second"]],
    [["--max-rating", "0"], ["Zero", "Negative"]],
    [["--min-rating", "0", "--max-rating", "0"], ["Zero"]],
    [["--min-rating", "40"], []],
    [["--max-rating=-0.125"], ["Negative"]],
  ] as const) {
    test(`supports ${flags.join(" ")} without sorting or rounding`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{ year: 2026 }]);
      const output = parse(result.stdout);
      expect(output.sp_ratings.map((row: TeamSP) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
    });
  }

  test("unfiltered output has no filters and team-only scopes are forwarded", async () => {
    const unfiltered = await invoke(["--year", "2026"]);
    expect(parse(unfiltered.stdout).filters).toBeUndefined();
    expect(parse(unfiltered.stdout).count).toBe(4);
    const teamOnly = await invoke(["--team", "First", "--min-rating", "0"]);
    expect(teamOnly.exitCode).toBe(0);
    expect(teamOnly.requests).toEqual([{ team: "First" }]);
  });

  for (const flags of [
    ["--min-rating", "2", "--max-rating", "1"], ["--min-rating", "NaN"],
    ["--max-rating", "Infinity"], ["--min-rating", " "], ["--max-rating", "bad"],
  ]) {
    test(`rejects ${flags.join(" ")} before requesting`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
    });
  }

  test("bounds do not replace the required year or team", async () => {
    const result = await invoke(["--min-rating", "0"]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
  });

  test("help exposes inclusive local bounds", () => {
    const ratings = createProgram().commands.find((command) => command.name() === "ratings")!;
    const sp = ratings.commands.find((command) => command.name() === "sp")!;
    expect(sp.helpInformation()).toContain("--min-rating");
    expect(sp.helpInformation()).toContain("--max-rating");
    expect(sp.helpInformation()).toContain("Local filter: minimum SP+ rating (inclusive)");
  });
});

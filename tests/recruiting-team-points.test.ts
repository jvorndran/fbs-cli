import { describe, expect, test } from "bun:test";
import type { GetTeamRecruitingRankingsResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rankings = [
  { year: 2026, team: "A", rank: 8, points: 245.678901 },
  { year: 2026, team: "B", rank: 1, points: 300 },
  { year: 2026, team: "C", rank: 100, points: 0 },
  { year: 2026, team: "D", rank: 80, points: null },
  { year: 2026, team: "E", rank: 90 },
] as GetTeamRecruitingRankingsResponse;

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async recruitingTeams(query) { calls.push(query); return rankings; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["recruiting", "teams", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("team recruiting points cohorts", () => {
  test("combines inclusive points bounds with rank and provider scopes without rounding", async () => {
    const result = await invoke(["--year", "2026", "--team", "A", "--max-rank", "10",
      "--min-points", "245.678901", "--max-points", "245.678901"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2026, team: "A" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.calls[0]);
    expect(output.filters).toEqual({ max_rank: 10, min_points: 245.678901, max_points: 245.678901 });
    expect(output.team_rankings).toEqual([rankings[0]]);
    expect(output.count).toBe(1);
  });

  for (const [flags, teams] of [
    [["--max-points", "245.678901"], ["A", "C"]],
    [["--min-points", "245.678901"], ["A", "B"]],
    [["--min-points", "0", "--max-points", "0"], ["C"]],
    [["--min-points", "500"], []], [[], ["A", "B", "C", "D", "E"]],
  ] as const) {
    test(`retains provider order and only filters available values: ${flags.join(" ")}`, async () => {
      const result = await invoke([...flags]);
      expect(result.exitCode).toBe(0);
      expect(result.calls).toEqual([{}]);
      const output = parse(result.stdout);
      expect(output.team_rankings.map((row: { team: string }) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
      if (!flags.length) expect(output.filters).toBeUndefined();
    });
  }

  for (const flags of [["--min-points", "2", "--max-points", "1"],
    ["--min-points", "NaN"], ["--max-points", "Infinity"], ["--max-points", " "]]) {
    test(`rejects ${flags.join(" ")} before fetching`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.calls).toEqual([]);
      expect(result.stdout).toBe("");
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("help exposes local points bounds", () => {
    const recruiting = createProgram().commands.find((c) => c.name() === "recruiting")!;
    const help = recruiting.commands.find((c) => c.name() === "teams")!.helpInformation();
    expect(help).toContain("--min-points");
    expect(help).toContain("--max-points");
    expect(help).toContain("Local filter");
  });
});

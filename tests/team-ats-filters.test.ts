import { describe, expect, test } from "bun:test";
import type { TeamATS } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamATS[] = [
  { year: 2025, teamId: 1, team: "Positive", conference: "ACC", games: 12, atsWins: 8, atsLosses: 3, atsPushes: 1, avgCoverMargin: 4.123456789 },
  { year: 2025, teamId: 2, team: "Even", conference: "ACC", games: 10, atsWins: 5, atsLosses: 5, atsPushes: 0, avgCoverMargin: 0 },
  { year: 2025, teamId: 3, team: "Negative", conference: "ACC", games: 12, atsWins: 3, atsLosses: 9, atsPushes: 0, avgCoverMargin: -4.5 },
  { year: 2025, teamId: 4, team: "Unavailable", conference: null, games: 0, atsWins: 0, atsLosses: 0, atsPushes: 0, avgCoverMargin: null },
];

async function invoke(flags: string[], data = rows) {
  const requests: unknown[] = [];
  const mock = await createMockApi({ async teamAts(query) { requests.push(query); return data; } });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["teams", "ats", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("historical ATS cohorts", () => {
  test("composes inclusive sample and cover-margin bounds without changing the provider query", async () => {
    const result = await invoke(["--year", "2025", "--conference", "ACC", "--min-games", "10", "--max-games", "12",
      "--min-avg-cover-margin", "0", "--max-avg-cover-margin", "4.123456789"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2025, conference: "ACC" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.requests[0]);
    expect(output.filters).toEqual({ min_games: 10, max_games: 12, min_avg_cover_margin: 0, max_avg_cover_margin: 4.123456789 });
    expect(output.team_ats.map((r: { team_id: number }) => r.team_id)).toEqual([1, 2]);
    expect(output.count).toBe(2);
    expect(output.team_ats[0].avg_cover_margin).toBe(4.123456789);
    expect(output.team_ats[1].ats_pushes).toBe(0);
  });

  for (const [flags, ids] of [
    [[], [1, 2, 3, 4]], [["--max-games", "0"], [4]],
    [["--max-avg-cover-margin", "0"], [2, 3]],
    [["--min-avg-cover-margin", "-4.5", "--max-avg-cover-margin", "-4.5"], [3]],
    [["--min-games", "13"], []],
  ] as const) {
    test(`handles boundaries and unavailable margins for ${flags.join(" ") || "no filters"}`, async () => {
      const result = await invoke(["--year", "2025", ...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.team_ats.map((r: { team_id: number }) => r.team_id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
      if (!flags.length) expect(output.filters).toBeUndefined();
    });
  }

  for (const flags of [
    ["--min-games", "3", "--max-games", "2"], ["--min-games", "-1"], ["--max-games", "1.5"],
    ["--min-avg-cover-margin", "1", "--max-avg-cover-margin", "-1"],
    ["--min-avg-cover-margin", "NaN"], ["--max-avg-cover-margin", "Infinity"],
  ]) {
    test(`rejects ${flags.join(" ")} before a request`, async () => {
      const result = await invoke(["--year", "2025", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
    });
  }

  test("requires year and documents all four local bounds", async () => {
    const result = await invoke(["--min-games", "10"]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
    const teams = createProgram().commands.find((c) => c.name() === "teams")!;
    const help = teams.commands.find((c) => c.name() === "ats")!.helpInformation();
    for (const flag of ["--min-games", "--max-games", "--min-avg-cover-margin", "--max-avg-cover-margin"]) {
      expect(help).toContain(flag);
    }
  });
});

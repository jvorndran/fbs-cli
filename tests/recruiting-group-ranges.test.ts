import { describe, expect, test } from "bun:test";
import type { GetAggregatedTeamRecruitingRatingsResponse } from "cfbd";
import { parse } from "yaml";

import { runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const groups = [
  { team: "A", positionGroup: "QB", commits: 2, averageStars: 3.456789 },
  { team: "B", positionGroup: "QB", commits: 5, averageStars: 4.5 },
  { team: "C", positionGroup: "WR", commits: 0, averageStars: 0 },
  { team: "D", commits: null, averageStars: null },
  { team: "E" },
] as GetAggregatedTeamRecruitingRatingsResponse;

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async recruitingGroups(query) { calls.push(query); return groups; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["recruiting", "groups", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("recruiting group cohort ranges", () => {
  test("composes inclusive bounds with position group and preserves the provider query and precision", async () => {
    const result = await invoke(["--team", "A", "--start-year", "2020", "--end-year", "2026",
      "--position-group", " qb ", "--min-commits", "2", "--max-commits", "2",
      "--min-average-stars", "3", "--max-average-stars", "3.456789"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ team: "A", startYear: 2020, endYear: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ team: "A", start_year: 2020, end_year: 2026 });
    expect(output.filters).toEqual({ position_group: "qb", min_commits: 2, max_commits: 2,
      min_average_stars: 3, max_average_stars: 3.456789 });
    expect(output.count).toBe(1);
    expect(output.recruiting_groups[0]).toEqual({ team: "A", position_group: "QB", commits: 2, average_stars: 3.456789 });
  });

  for (const [flags, teams] of [
    [["--max-commits", "2"], ["A", "C"]],
    [["--max-average-stars", "3.456789"], ["A", "C"]],
    [["--max-commits", "0", "--max-average-stars", "0"], ["C"]],
    [["--min-commits", "9", "--max-commits", "10"], []],
    [[], ["A", "B", "C", "D", "E"]],
  ] as const) {
    test(`preserves order and excludes unavailable values only for active bounds: ${flags.join(" ")}`, async () => {
      const result = await invoke([...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.recruiting_groups.map((row: { team: string }) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
      if (!flags.length) expect(output.filters).toBeUndefined();
    });
  }

  for (const flags of [
    ["--min-commits", "3", "--max-commits", "2"],
    ["--min-average-stars", "4", "--max-average-stars", "3"],
    ["--max-commits", "-1"], ["--max-commits", "1.5"],
    ["--max-commits", "9007199254740992"], ["--max-average-stars", "NaN"],
    ["--max-average-stars", "Infinity"], ["--max-average-stars", " "],
  ]) {
    test(`rejects invalid bounds before a request: ${flags.join(" ")}`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toEqual([]);
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }
});

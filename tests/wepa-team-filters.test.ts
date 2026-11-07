import { expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { teamId: 9, team: "First", epa: { total: 0.123456789, passing: 99 }, epaAllowed: { total: -0.2 } },
  { teamId: 2, team: "Second", epa: { total: 0.123456789 }, epaAllowed: { total: -0.2 } },
  { teamId: 0, team: "Zero", epa: { total: 0 }, epaAllowed: { total: 0 } },
  { teamId: 3, team: "Negative", epa: { total: -0.5 }, epaAllowed: { total: 0.4 } },
  { teamId: 4, team: "Missing offense", epaAllowed: { total: -0.2 } },
  { teamId: 5, team: "Missing defense", epa: { total: 0.123456789 }, epaAllowed: null },
  { teamId: 6, team: "Null totals", epa: { total: null }, epaAllowed: { total: null } },
  { teamId: 7, team: "Passing only", epa: { passing: 99 }, epaAllowed: { passing: -99 } },
];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = {
    async wepaTeamSeason(query: unknown) { requests.push(query); return rows; },
  } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["wepa", "team", "season", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("team EPA bounds compose locally and preserve total fields, ties, order and precision", async () => {
  const result = await invoke([
    "--year", "2026", "--conference", "ACC", "--team", "Florida State",
    "--min-epa", "0.123456789", "--max-epa", "0.123456789",
    "--min-epa-allowed=-0.2", "--max-epa-allowed=-0.2",
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, conference: "ACC", team: "Florida State" }]);
  const output = parse(result.stdout);
  expect(output.command).toBe("wepa team season");
  expect(output.endpoint).toBe("/wepa/team/season");
  expect(output.query).toEqual(result.requests[0]);
  expect(output.filters).toEqual({
    min_epa: 0.123456789, max_epa: 0.123456789, min_epa_allowed: -0.2, max_epa_allowed: -0.2,
  });
  expect(output.count).toBe(2);
  expect(output.team_metrics).toEqual([
    { team_id: 9, team: "First", epa: { total: 0.123456789, passing: 99 }, epa_allowed: { total: -0.2 } },
    { team_id: 2, team: "Second", epa: { total: 0.123456789 }, epa_allowed: { total: -0.2 } },
  ]);
});

for (const [flags, ids, filters] of [
  [["--min-epa", "0", "--max-epa", "0"], [0], { min_epa: 0, max_epa: 0 }],
  [["--max-epa=-0.5"], [3], { max_epa: -0.5 }],
  [["--min-epa", "0.123456789"], [9, 2, 5], { min_epa: 0.123456789 }],
  [["--min-epa-allowed", "0", "--max-epa-allowed", "0"], [0], { min_epa_allowed: 0, max_epa_allowed: 0 }],
  [["--max-epa-allowed=-0.2"], [9, 2, 4], { max_epa_allowed: -0.2 }],
  [["--min-epa-allowed", "0.4"], [3], { min_epa_allowed: 0.4 }],
  [["--min-epa", "100"], [], { min_epa: 100 }],
  [[], [9, 2, 0, 3, 4, 5, 6, 7], undefined],
] as const) {
  test(`team EPA bounds: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{}]);
    const output = parse(result.stdout);
    expect(output.filters).toEqual(filters);
    expect(output.count).toBe(ids.length);
    expect(output.team_metrics.map((row: { team_id: number }) => row.team_id)).toEqual([...ids]);
  });
}

for (const [flags, code] of [
  [["--min-epa", "1", "--max-epa", "0"], "invalid_query"],
  [["--min-epa-allowed", "0", "--max-epa-allowed=-1"], "invalid_query"],
  [["--min-epa", "NaN"], "cli_parse_error"], [["--max-epa", "Infinity"], "cli_parse_error"],
  [["--min-epa-allowed", " "], "cli_parse_error"], [["--max-epa-allowed=-Infinity"], "cli_parse_error"],
] as const) {
  test(`invalid team EPA bounds fail before requesting data: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("team season help exposes all four local bounds", async () => {
  const result = await invoke(["--help"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-epa", "--max-epa", "--min-epa-allowed", "--max-epa-allowed"]) {
    expect(result.stdout).toContain(`${flag} <number>`);
  }
});

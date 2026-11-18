import { expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { teamId: 9, team: "First", successRate: { total: 0.123456789, passing: 99 }, successRateAllowed: { total: 0.2 } },
  { teamId: 2, team: "Second", successRate: { total: 0.123456789 }, successRateAllowed: { total: 0.2 } },
  { teamId: 0, team: "Zero", successRate: { total: 0 }, successRateAllowed: { total: 0 } },
  { teamId: 3, team: "High offense", successRate: { total: 0.8 }, successRateAllowed: { total: 0.4 } },
  { teamId: 4, team: "Missing offense", successRateAllowed: { total: 0.2 } },
  { teamId: 5, team: "Missing defense", successRate: { total: 0.123456789 }, successRateAllowed: null },
  { teamId: 6, team: "Null totals", successRate: { total: null }, successRateAllowed: { total: null } },
  { teamId: 7, team: "Passing only", successRate: { passing: 99 }, successRateAllowed: { passing: -99 } },
];

async function invoke(flags: readonly string[], payload: unknown = rows) {
  const requests: unknown[] = [];
  const api = {
    async wepaTeamSeason(query: unknown) { requests.push(query); return payload; },
  } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["wepa", "team", "season", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("team success rate bounds compose locally and preserve total fields, ties, order and precision", async () => {
  const result = await invoke([
    "--year", "2026", "--conference", "ACC", "--team", "Florida State",
    "--min-success-rate", "0.123456789", "--max-success-rate", "0.123456789",
    "--min-success-rate-allowed=0.2", "--max-success-rate-allowed=0.2",
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, conference: "ACC", team: "Florida State" }]);
  const output = parse(result.stdout);
  expect(output.command).toBe("wepa team season");
  expect(output.endpoint).toBe("/wepa/team/season");
  expect(output.query).toEqual(result.requests[0]);
  expect(output.filters).toEqual({
    min_success_rate: 0.123456789, max_success_rate: 0.123456789, min_success_rate_allowed: 0.2, max_success_rate_allowed: 0.2,
  });
  expect(output.count).toBe(2);
  expect(output.team_metrics).toEqual([
    { team_id: 9, team: "First", success_rate: { total: 0.123456789, passing: 99 }, success_rate_allowed: { total: 0.2 } },
    { team_id: 2, team: "Second", success_rate: { total: 0.123456789 }, success_rate_allowed: { total: 0.2 } },
  ]);
});

for (const [flags, ids, filters] of [
  [["--min-success-rate", "0", "--max-success-rate", "0"], [0], { min_success_rate: 0, max_success_rate: 0 }],
  [["--min-success-rate", "0.8"], [3], { min_success_rate: 0.8 }],
  [["--min-success-rate", "0.123456789"], [9, 2, 3, 5], { min_success_rate: 0.123456789 }],
  [["--min-success-rate-allowed", "0", "--max-success-rate-allowed", "0"], [0], { min_success_rate_allowed: 0, max_success_rate_allowed: 0 }],
  [["--max-success-rate-allowed=0.2"], [9, 2, 0, 4], { max_success_rate_allowed: 0.2 }],
  [["--min-success-rate-allowed", "0.4"], [3], { min_success_rate_allowed: 0.4 }],
  [["--min-success-rate", "0.99"], [], { min_success_rate: 0.99 }],
  [[], [9, 2, 0, 3, 4, 5, 6, 7], undefined],
] as const) {
  test(`team success rate bounds: ${flags.join(" ") || "omitted"}`, async () => {
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
  [["--min-success-rate", "1", "--max-success-rate", "0"], "invalid_query"],
  [["--min-success-rate-allowed", "0", "--max-success-rate-allowed=-1"], "invalid_query"],
  [["--min-success-rate=-0.01"], "invalid_query"], [["--max-success-rate", "1.01"], "invalid_query"],
  [["--min-success-rate-allowed=-0.01"], "invalid_query"], [["--max-success-rate-allowed", "1.01"], "invalid_query"],
  [["--min-success-rate", "NaN"], "cli_parse_error"], [["--max-success-rate", "Infinity"], "cli_parse_error"],
  [["--min-success-rate-allowed", " "], "cli_parse_error"], [["--max-success-rate-allowed=-Infinity"], "cli_parse_error"],
] as const) {
  test(`invalid team success rate bounds fail before requesting data: ${flags.join(" ")}`, async () => {
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
  for (const flag of ["--min-success-rate", "--max-success-rate", "--min-success-rate-allowed", "--max-success-rate-allowed"]) {
    expect(result.stdout).toContain(`${flag} <number>`);
  }
});


test("success-rate bounds include one and compose with existing EPA bounds", async () => {
  const result = await invoke([
    "--min-success-rate", "1", "--max-success-rate", "1",
    "--min-success-rate-allowed", "0", "--max-success-rate-allowed", "0",
    "--min-epa", "0", "--max-epa-allowed", "0",
  ], [
    {teamId: 0, successRate: {total: 1}, successRateAllowed: {total: 0}, epa: {total: 0}, epaAllowed: {total: 0}},
    {teamId: 1, successRate: {total: 1}, successRateAllowed: {total: 0}, epa: {total: -0.1}, epaAllowed: {total: 0}},
    {teamId: 2, successRate: {total: 1}, successRateAllowed: {total: 0}, epa: {total: 0}, epaAllowed: {total: 0.1}},
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{}]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_metrics[0].team_id).toBe(0);
  expect(output.team_metrics[0].success_rate.total).toBe(1);
  expect(output.team_metrics[0].success_rate_allowed.total).toBe(0);
  expect(output.filters).toEqual({min_epa: 0, max_epa_allowed: 0,
    min_success_rate: 1, max_success_rate: 1, min_success_rate_allowed: 0, max_success_rate_allowed: 0});
});

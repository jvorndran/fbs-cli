import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const paths = ["passing-downs-success-rate", "standard-downs-success-rate", "passing-downs-success-rate-allowed", "standard-downs-success-rate-allowed"];
const rows = [
  {teamId: 9, successRate: {total: 0.8, passingDowns: 0.123456789, standardDowns: 1}, successRateAllowed: {passingDowns: 0.5, standardDowns: 0.7}},
  {teamId: 2, successRate: {total: 0.8, passingDowns: 0.123456789, standardDowns: 1}, successRateAllowed: {passingDowns: 0.5, standardDowns: 0.7}},
  {teamId: 0, successRate: {passingDowns: 0, standardDowns: 0}, successRateAllowed: {passingDowns: 0, standardDowns: 0}},
  {teamId: 3, successRate: {passingDowns: 1}, successRateAllowed: {standardDowns: 1}},
  {teamId: 4, successRate: {standardDowns: 1}, successRateAllowed: {passingDowns: 1}},
  {teamId: 5, successRate: {passingDowns: null}, successRateAllowed: null},
];
async function invoke(flags: string[]) {
  const requests: unknown[] = [];
  const api = { async wepaTeamSeason(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "", stderr = "";
  const exitCode = await runCli(["wepa", "team", "season", ...flags], {api, environment: {},
    io: {stdout: value => {stdout += value;}, stderr: value => {stderr += value;}}});
  return {exitCode, stdout, stderr, requests};
}
test("split success rates compose locally with provider scopes and total bounds", async () => {
  const flags = paths.flatMap((path, i) => [`--min-${path}=${[0.123456789,1,0.5,0.7][i]}`, `--max-${path}=${[0.123456789,1,0.5,0.7][i]}`]);
  const result = await invoke(["--year=2026", "--team=Florida State", "--conference=ACC", "--min-success-rate=0.8", ...flags]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{year:2026, team:"Florida State", conference:"ACC"}]);
  const output = parse(result.stdout);
  expect(output.query).toEqual(result.requests[0]);
  expect(output.count).toBe(2);
  expect(output.team_metrics.map((row: {team_id: number}) => row.team_id)).toEqual([9,2]);
  expect(output.team_metrics[0].success_rate.passing_downs).toBe(0.123456789);
  expect(output.filters).toEqual(Object.fromEntries([
    ["min_success_rate",0.8], ...paths.flatMap((path,i) => [[`min_${path.replaceAll("-","_")}`,[0.123456789,1,0.5,0.7][i]], [`max_${path.replaceAll("-","_")}`,[0.123456789,1,0.5,0.7][i]]])
  ]));
});
for (const [i, path] of paths.entries()) {
  test(`split success ${path} includes endpoints and rejects only missing active fields`, async () => {
    for (const [bounds, ids] of [
      [[`--min-${path}=0`, `--max-${path}=0`], [0]],
      [[`--min-${path}=1`], [[3],[9,2,4],[4],[3]][i]],
      [[`--max-${path}=1`], [[9,2,0,3],[9,2,0,4],[9,2,0,4],[9,2,0,3]][i]],
    ] as const) {
      const result = await invoke([...bounds]);
      expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{}]);
      expect(parse(result.stdout).team_metrics.map((row: {team_id: number}) => row.team_id)).toEqual(ids);
    }
  });
  for (const [flags, code] of [
    [[`--min-${path}=0.8`, `--max-${path}=0.2`], "invalid_query"],
    [[`--min-${path}=-0.1`], "invalid_query"],
    [[`--max-${path}=1.1`], "invalid_query"],
    [[`--min-${path}=NaN`], "cli_parse_error"],
    [[`--max-${path}=Infinity`], "cli_parse_error"],
  ] as const) {
    test(`invalid split success: ${flags.join(" ")}`, async () => {
      const result = await invoke([...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
      expect(parse(result.stderr).error.code).toBe(code);
    });
  }
}
test("omitted split success bounds retain every row and help lists all bounds", async () => {
  const result = await invoke([]);
  expect(result.exitCode).toBe(0);
  expect(parse(result.stdout).count).toBe(rows.length);
  expect(parse(result.stdout).filters).toBeUndefined();
  const help = await invoke(["--help"]);
  expect(help.requests).toEqual([]);
  for (const path of paths) for (const prefix of ["min", "max"]) expect(help.stdout).toContain(`--${prefix}-${path} <number>`);
});

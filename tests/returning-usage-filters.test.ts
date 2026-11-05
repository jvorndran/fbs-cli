import { expect, test } from "bun:test";
import type { CfbdApi } from "../src/cfbd/api";
import { parse } from "yaml";
import { runCli } from "../src/index";

const rows = [0.710987654321, 0.710987654321, 0, 1, null].map((usage, i) => ({
  season: 2026, team: `Team ${i}`, conference: "ACC", usage, passingUsage: 0.99,
  percentPPA: -0.123456789,
}));

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = { async returningProduction(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["player", "returning", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("returning usage bounds stay local and preserve retained PPA, order and precision", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--conference", "ACC",
    "--min-usage", "0.710987654321", "--max-usage", "0.710987654321"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", conference: "ACC" }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ min_usage: 0.710987654321, max_usage: 0.710987654321 });
  expect(output.returning_production.map((row: { team: string }) => row.team)).toEqual(["Team 0", "Team 1"]);
  expect(output.returning_production[0]).toMatchObject({ usage: 0.710987654321, percent_ppa: -0.123456789, passing_usage: 0.99 });
  expect(output.count).toBe(2);
});

for (const [flags, teams] of [
  [["--min-usage", "0", "--max-usage", "0"], [2]],
  [["--min-usage", "1"], [3]],
  [["--max-usage", "0.5"], [2]],
  [["--min-usage", "0.8", "--max-usage", "0.9"], []],
  [[], [0, 1, 2, 3, 4]],
] as const) {
  test(`returning usage: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(["--team", "Example", ...flags]);
    expect(result.exitCode).toBe(0);
    expect(result.requests).toEqual([{ team: "Example" }]);
    const output = parse(result.stdout);
    expect(output.returning_production.map((row: { team: string }) => row.team)).toEqual(teams.map((i) => `Team ${i}`));
    expect(output.count).toBe(teams.length);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const flags of [
  ["--min-usage", "0.8", "--max-usage", "0.5"], ["--min-usage", "NaN"],
  ["--max-usage", "Infinity"], ["--min-usage", " "], ["--min-usage=-0.1"],
  ["--max-usage", "1.01"],
]) {
  test(`invalid returning usage fails before request: ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

test("returning usage never replaces required year or team", async () => {
  const result = await invoke(["--min-usage", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.requests).toEqual([]);
});

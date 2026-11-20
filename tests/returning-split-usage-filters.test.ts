import { expect, test } from "bun:test";
import type { CfbdApi } from "../src/cfbd/api";
import { parse } from "yaml";
import { runCli } from "../src/index";

const rows = [
  { team: "A", usage: 0.8, passingUsage: 0.7123456789, rushingUsage: 0.2 },
  { team: "B", usage: 0.8, passingUsage: 0.7123456789, rushingUsage: 0.2 },
  { team: "C", usage: 0, passingUsage: 0, rushingUsage: 1 },
  { team: "D", usage: 1, passingUsage: 1, rushingUsage: 0 },
  { team: "E", usage: 0.8, passingUsage: null, rushingUsage: 0.2 },
  { team: "F", usage: 0.8, passingUsage: 0.7123456789, rushingUsage: null },
].map((row) => ({ ...row, season: 2026, percentPPA: -0.123456789, receivingUsage: 0.99 }));

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

test("returning split usage composes bounds and provider scopes without rounding", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--conference", "ACC",
    "--min-usage", "0.8", "--min-passing-usage", "0.7123456789", "--max-passing-usage", "0.7123456789",
    "--min-rushing-usage", "0.2", "--max-rushing-usage", "0.2"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", conference: "ACC" }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual({ year: 2026, team: "Example", conference: "ACC" });
  expect(output.filters).toEqual({ min_usage: 0.8, min_passing_usage: 0.7123456789,
    max_passing_usage: 0.7123456789, min_rushing_usage: 0.2, max_rushing_usage: 0.2 });
  expect(output.returning_production.map((row: { team: string }) => row.team)).toEqual(["A", "B"]);
  expect(output.returning_production[0]).toMatchObject({ passing_usage: 0.7123456789,
    rushing_usage: 0.2, percent_ppa: -0.123456789, receiving_usage: 0.99 });
  expect(output.count).toBe(2);
});

for (const [flags, teams] of [
  [["--min-passing-usage", "0", "--max-passing-usage", "0"], ["C"]],
  [["--min-passing-usage", "1"], ["D"]],
  [["--max-passing-usage", "0.8"], ["A", "B", "C", "F"]],
  [["--min-rushing-usage", "0", "--max-rushing-usage", "0"], ["D"]],
  [["--min-rushing-usage", "1"], ["C"]],
  [["--max-rushing-usage", "0.2"], ["A", "B", "D", "E"]],
  [["--min-passing-usage", "0.8", "--max-passing-usage", "0.9"], []],
  [[], ["A", "B", "C", "D", "E", "F"]],
] as const) {
  test(`returning split usage: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(["--team", "Example", ...flags]);
    expect(result.exitCode).toBe(0);
    expect(result.requests).toEqual([{ team: "Example" }]);
    const output = parse(result.stdout);
    expect(output.returning_production.map((row: { team: string }) => row.team)).toEqual([...teams]);
    expect(output.count).toBe(teams.length);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const flags of [
  ["--min-passing-usage", "0.8", "--max-passing-usage", "0.5"],
  ["--min-rushing-usage", "1", "--max-rushing-usage", "0"],
  ["--min-passing-usage", "NaN"], ["--max-passing-usage", "Infinity"],
  ["--min-rushing-usage", " "], ["--min-rushing-usage=-0.1"],
  ["--max-passing-usage", "1.01"], ["--max-rushing-usage", "1.01"],
]) {
  test(`invalid returning split usage fails before request: ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

test("split usage does not replace required provider scope and help lists bounds", async () => {
  const result = await invoke(["--min-passing-usage", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.requests).toEqual([]);
  const help = await invoke(["--help"]);
  for (const flag of ["--min-passing-usage", "--max-passing-usage", "--min-rushing-usage", "--max-rushing-usage"]) {
    expect(help.stdout).toContain(`${flag} <number>`);
  }
});

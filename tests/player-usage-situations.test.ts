import { expect, test } from "bun:test";
import type { PlayerUsage } from "cfbd";
import { parse } from "yaml";
import { runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows = [
  { overall: 0.8, standardDowns: 0.710987654321, passingDowns: 0.2 },
  { overall: 0.8, standardDowns: 0.710987654321, passingDowns: 0.2 },
  { overall: 0, standardDowns: 0, passingDowns: 1 },
  { overall: 1, standardDowns: 1, passingDowns: 0 },
  { overall: null, standardDowns: null, passingDowns: null },
  { overall: 0.8 },
].map((usage, i) => ({ season: 2026, id: `900719925474099${i}`, name: `Player ${i}`,
  team: "Example", conference: "ACC", position: "QB", usage })) as PlayerUsage[];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({ async playerUsage(query) { requests.push(query); return rows; } });
  let stdout = "", stderr = "";
  const exitCode = await runCli(["player", "usage", ...flags], { api: mock.api, environment: {},
    io: { stdout: (v) => { stdout += v; }, stderr: (v) => { stderr += v; } } });
  return { exitCode, stdout, stderr, requests };
}

test("situational usage bounds compose with overall and provider scopes without rounding", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--position", "QB",
    "--exclude-garbage-time", "--min-usage", "0.8", "--min-standard-downs-usage", "0.710987654321",
    "--max-standard-downs-usage", "0.710987654321", "--min-passing-downs-usage", "0.2", "--max-passing-downs-usage", "0.2"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", position: "QB", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual({ year: 2026, team: "Example", position: "QB", exclude_garbage_time: true });
  expect(output.filters).toEqual({ min_usage: 0.8, min_standard_downs_usage: 0.710987654321,
    max_standard_downs_usage: 0.710987654321, min_passing_downs_usage: 0.2, max_passing_downs_usage: 0.2 });
  expect(output.count).toBe(2);
  expect(output.player_usage.map((r: {player_id: string}) => r.player_id)).toEqual([rows[0]!.id, rows[1]!.id]);
  expect(output.player_usage[0].usage).toEqual({overall: 0.8,
    standard_downs: 0.710987654321, passing_downs: 0.2});
});

for (const [flags, ids] of [
  [["--min-standard-downs-usage", "0", "--max-standard-downs-usage", "0"], [2]],
  [["--min-standard-downs-usage", "1"], [3]],
  [["--max-passing-downs-usage", "0"], [3]],
  [["--min-passing-downs-usage", "1", "--max-passing-downs-usage", "1"], [2]],
  [["--min-passing-downs-usage", "0.3", "--max-passing-downs-usage", "0.9"], []],
  [["--min-standard-downs-usage", "0.7"], [0, 1, 3]],
  [[], [0, 1, 2, 3, 4, 5]],
] as const) test(`situational usages ${flags.join(" ") || "omitted"}`, async () => {
  const result = await invoke(["--year", "2026", ...flags]);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([{year: 2026}]);
  const output = parse(result.stdout);
  expect(output.count).toBe(ids.length);
  expect(output.player_usage.map((r: {player_id: string}) => r.player_id)).toEqual(ids.map(i => rows[i]!.id));
  if (!flags.length) expect(output.filters).toBeUndefined();
});

for (const split of ["standard-downs", "passing-downs"]) {
  for (const flags of [
    [`--min-${split}-usage`, "0.8", `--max-${split}-usage`, "0.2"],
    [`--min-${split}-usage`, "NaN"], [`--max-${split}-usage`, "Infinity"],
    [`--min-${split}-usage`, " "], [`--min-${split}-usage=-0.01`],
    [`--max-${split}-usage`, "1.01"],
  ]) test(`invalid split fails before requests ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}
test("situational usage filters cannot replace the required year", async () => {
  const result=await invoke(["--min-standard-downs-usage", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.requests).toEqual([]);
});

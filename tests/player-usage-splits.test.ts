import { expect, test } from "bun:test";
import type { PlayerUsage } from "cfbd";
import { parse } from "yaml";
import { runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows = [
  { overall: 0.8, pass: 0.710987654321, rush: 0.2 },
  { overall: 0.8, pass: 0.710987654321, rush: 0.2 },
  { overall: 0, pass: 0, rush: 1 },
  { overall: 1, pass: 1, rush: 0 },
  { overall: null, pass: null, rush: null },
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

test("usage split bounds compose with overall and provider scopes without rounding", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--position", "QB",
    "--exclude-garbage-time", "--min-usage", "0.8", "--min-pass-usage", "0.710987654321",
    "--max-pass-usage", "0.710987654321", "--min-rush-usage", "0.2", "--max-rush-usage", "0.2"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", position: "QB", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual({ year: 2026, team: "Example", position: "QB", exclude_garbage_time: true });
  expect(output.filters).toEqual({ min_usage: 0.8, min_pass_usage: 0.710987654321,
    max_pass_usage: 0.710987654321, min_rush_usage: 0.2, max_rush_usage: 0.2 });
  expect(output.count).toBe(2);
  expect(output.player_usage.map((r: {player_id: string}) => r.player_id)).toEqual([rows[0]!.id, rows[1]!.id]);
  expect(output.player_usage[0].usage).toEqual(rows[0]!.usage);
});

for (const [flags, ids] of [
  [["--min-pass-usage", "0", "--max-pass-usage", "0"], [2]],
  [["--min-pass-usage", "1"], [3]],
  [["--max-rush-usage", "0"], [3]],
  [["--min-rush-usage", "1", "--max-rush-usage", "1"], [2]],
  [["--min-rush-usage", "0.3", "--max-rush-usage", "0.9"], []],
  [["--min-pass-usage", "0.7"], [0, 1, 3]],
  [[], [0, 1, 2, 3, 4, 5]],
] as const) test(`usage splits ${flags.join(" ") || "omitted"}`, async () => {
  const result = await invoke(["--year", "2026", ...flags]);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([{year: 2026}]);
  const output = parse(result.stdout);
  expect(output.count).toBe(ids.length);
  expect(output.player_usage.map((r: {player_id: string}) => r.player_id)).toEqual(ids.map(i => rows[i]!.id));
  if (!flags.length) expect(output.filters).toBeUndefined();
});

for (const split of ["pass", "rush"]) {
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
test("usage split filters cannot replace the required year", async () => {
  const result=await invoke(["--min-pass-usage", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.requests).toEqual([]);
});

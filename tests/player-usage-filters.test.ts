import { expect, test } from "bun:test";
import type { PlayerUsage } from "cfbd";
import { parse } from "yaml";

import { runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows = [0.710987654321, 0.710987654321, 0, 1, null].map((overall, i) => ({
  season: 2026, id: `900719925474099${i}`, name: `Player ${i}`, team: "Example",
  conference: "ACC", position: "QB", usage: { overall, pass: 0.92 },
})) as PlayerUsage[];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({ async playerUsage(query) { requests.push(query); return rows; } });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["player", "usage", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("overall usage bounds compose with provider options and preserve exact shares and IDs", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--position", "QB",
    "--exclude-garbage-time", "--min-usage", "0.710987654321", "--max-usage", "0.710987654321"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", position: "QB", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ min_usage: 0.710987654321, max_usage: 0.710987654321 });
  expect(output.player_usage.map((row: { player_id: string }) => row.player_id)).toEqual([rows[0]!.id, rows[1]!.id]);
  expect(output.player_usage[0].usage).toEqual({ overall: 0.710987654321, pass: 0.92 });
  expect(output.count).toBe(2);
});

for (const [flags, ids] of [
  [["--min-usage", "0", "--max-usage", "0"], [2]],
  [["--min-usage", "1"], [3]],
  [["--max-usage", "0.5"], [2]],
  [["--min-usage", "0.8", "--max-usage", "0.9"], []],
  [[], [0, 1, 2, 3, 4]],
] as const) {
  test(`overall usage bounds: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(0);
    expect(result.requests).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.player_usage.map((row: { player_id: string }) => row.player_id)).toEqual(ids.map((i) => rows[i]!.id));
    expect(output.count).toBe(ids.length);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const flags of [
  ["--min-usage", "0.8", "--max-usage", "0.5"], ["--min-usage", "NaN"],
  ["--max-usage", "Infinity"], ["--min-usage", " "], ["--min-usage=-0.1"],
  ["--max-usage", "1.01"],
]) {
  test(`invalid usage bounds fail before requests: ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

test("local usage bounds never replace the required year", async () => {
  const result = await invoke(["--min-usage", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.requests).toEqual([]);
});

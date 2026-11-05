import { expect, test } from "bun:test";
import type { CfbdApi } from "../src/cfbd/api";
import { parse } from "yaml";
import { runCli } from "../src/index";

const rows = [0.710987654321, 0.710987654321, 0, 1, null].map((homeWinProbability, i) => ({
  season: 2026, gameId: i, homeTeam: `Team ${i}`, awayTeam: "Other", homeWinProbability,
  spread: -0.123456789,
}));

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = { async pregameWinProbabilities(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["metrics", "wp", "pregame", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("pregame home probability bounds stay local and preserve provider spread, order and precision", async () => {
  const result = await invoke(["--year", "2026", "--team", "Example", "--week", "0", "--home", "Team 0", "--away", "Other",
    "--min-home-win-probability", "0.710987654321", "--max-home-win-probability", "0.710987654321"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", week: 0 }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ home: "Team 0", away: "Other", min_home_win_probability: 0.710987654321, max_home_win_probability: 0.710987654321 });
  expect(output.pregame_win_probabilities.map((row: { home_team: string }) => row.home_team)).toEqual(["Team 0"]);
  expect(output.pregame_win_probabilities[0]).toMatchObject({ home_win_probability: 0.710987654321, spread: -0.123456789 });
  expect(output.count).toBe(1);
});

for (const [flags, teams] of [
  [["--min-home-win-probability", "0", "--max-home-win-probability", "0"], [2]],
  [["--min-home-win-probability", "1"], [3]],
  [["--max-home-win-probability", "0.5"], [2]],
  [["--min-home-win-probability", "0.8", "--max-home-win-probability", "0.9"], []],
  [[], [0, 1, 2, 3, 4]],
] as const) {
  test(`pregame home probability: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(["--team", "Example", ...flags]);
    expect(result.exitCode).toBe(0);
    expect(result.requests).toEqual([{ team: "Example" }]);
    const output = parse(result.stdout);
    expect(output.pregame_win_probabilities.map((row: { home_team: string }) => row.home_team)).toEqual(teams.map((i) => `Team ${i}`));
    expect(output.count).toBe(teams.length);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const flags of [
  ["--min-home-win-probability", "0.8", "--max-home-win-probability", "0.5"], ["--min-home-win-probability", "NaN"],
  ["--max-home-win-probability", "Infinity"], ["--min-home-win-probability", " "], ["--min-home-win-probability=-0.1"],
  ["--max-home-win-probability", "1.01"],
]) {
  test(`invalid pregame home probability fails before request: ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

test("pregame filters remain optional with no provider scope", async () => {
  const result = await invoke(["--max-home-win-probability", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([{}]);
  expect(parse(result.stdout).count).toBe(1);
});

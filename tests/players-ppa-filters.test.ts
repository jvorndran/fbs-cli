import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [0.123456789, 0, -0.5].map((value, i) => ({
  id: String(i), gameId: 9, name: "Player", team: "Test", opponent: "Other", averagePPA: { all: value, pass: 99 },
}));
rows.push({ id: "missing", gameId: 9, name: "Player", team: "Test", opponent: "Other", averagePPA: { pass: 99 } } as never);
async function invoke(flags: readonly string[], scoped = true) {
  const requests: unknown[] = [];
  let stdout = "", stderr = "";
  const api = { async playerGamePpa(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  const exitCode = await runCli([...["ppa", "players", "games"], ...(scoped ? ["--year", "2026", "--week", "0"] : []), ...flags], {
    api, environment: {},
    io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("players PPA: --min-average-ppa 0.123456789 --max-average-ppa 0.123456789", async () => {
  const result = await invoke(["--min-average-ppa", "0.123456789", "--max-average-ppa", "0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.player_game_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("players PPA: --min-average-ppa 0 --max-average-ppa 0", async () => {
  const result = await invoke(["--min-average-ppa", "0", "--max-average-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.player_game_ppa.map((row: { id: string }) => row.id)).toEqual(["1"]);
  expect(output.filters).toBeDefined();
});

test("players PPA: --max-average-ppa=-0.5", async () => {
  const result = await invoke(["--max-average-ppa=-0.5"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.player_game_ppa.map((row: { id: string }) => row.id)).toEqual(["2"]);
  expect(output.filters).toBeDefined();
});

test("players PPA: --min-average-ppa 100", async () => {
  const result = await invoke(["--min-average-ppa", "100"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(0);
  expect(output.player_game_ppa.map((row: { id: string }) => row.id)).toEqual([]);
  expect(output.filters).toBeDefined();
});

test("players PPA rejects --min-average-ppa 1 --max-average-ppa 0", async () => {
  const result = await invoke(["--min-average-ppa", "1", "--max-average-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("players PPA rejects --min-average-ppa NaN", async () => {
  const result = await invoke(["--min-average-ppa", "NaN"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("players PPA rejects --max-average-ppa Infinity", async () => {
  const result = await invoke(["--max-average-ppa", "Infinity"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("players PPA unfiltered output preserves unavailable values, order, IDs and precision", async () => {
  const result = await invoke([]);
  expect(result.exitCode).toBe(0);
  const output = parse(result.stdout);
  expect(output.filters).toBeUndefined();
  expect(output.player_game_ppa.map((row: { id: string }) => row.id)).toEqual(["0", "1", "2", "missing"]);
  expect(output.player_game_ppa[0].average_ppa.all).toBe(0.123456789);
});
test("players PPA bounds retain provider scope requirements", async () => {
  const result = await invoke(["--min-average-ppa", "0"], false);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});
test("players PPA help documents every bound without a request", async () => {
  const result = await invoke(["--help"], false);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-average-ppa", "--max-average-ppa"]) {
    expect(result.stdout).toContain(flag + " <number>");
  }
});

test("player game PPA bounds compose with identity filters and preserve the exact provider query", async () => {
  const result = await invoke(["--team", "Test", "--position", "QB", "--player-id", "0",
    "--threshold", "25", "--season-type", "regular", "--exclude-garbage-time",
    "--game-id", "9", "--player", " player ", "--opponent", " other ",
    "--min-average-ppa", "0.123456789", "--max-average-ppa", "0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0, team: "Test", position: "QB", playerId: "0",
    threshold: 25, seasonType: "regular", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ game_id: 9, player: "player", opponent: "other",
    min_average_ppa: 0.123456789, max_average_ppa: 0.123456789 });
  expect(output.count).toBe(1);
  expect(output.player_game_ppa[0].average_ppa).toEqual({ all: 0.123456789, pass: 99 });
});

test("player game PPA bounds still require a week or team when year is supplied", async () => {
  const result = await invoke(["--year", "2026", "--min-average-ppa", "0"], false);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [0.123456789, 0, -0.5].map((value, i) => ({
  id: String(i), gameId: 9, name: "Player", team: "Test", opponent: "Other", offense: { overall: value, passing: 99, cumulative: { total: 999 } }, defense: { overall: -value },
}));
rows.push({ id: "missing", gameId: 9, name: "Player", team: "Test", opponent: "Other", offense: { passing: 99 }, defense: null } as never);
async function invoke(flags: readonly string[], scoped = true) {
  const requests: unknown[] = [];
  let stdout = "", stderr = "";
  const api = { async gamePpa(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  const exitCode = await runCli([...["ppa", "games"], ...(scoped ? ["--year", "2026"] : []), ...flags], {
    api, environment: {},
    io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("games PPA: --min-offense-ppa 0.123456789 --max-offense-ppa 0.123456789", async () => {
  const result = await invoke(["--min-offense-ppa", "0.123456789", "--max-offense-ppa", "0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --min-offense-ppa 0 --max-offense-ppa 0", async () => {
  const result = await invoke(["--min-offense-ppa", "0", "--max-offense-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["1"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --max-offense-ppa=-0.5", async () => {
  const result = await invoke(["--max-offense-ppa=-0.5"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["2"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --min-offense-ppa 100", async () => {
  const result = await invoke(["--min-offense-ppa", "100"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(0);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual([]);
  expect(output.filters).toBeDefined();
});

test("games PPA rejects --min-offense-ppa 1 --max-offense-ppa 0", async () => {
  const result = await invoke(["--min-offense-ppa", "1", "--max-offense-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("games PPA rejects --min-offense-ppa NaN", async () => {
  const result = await invoke(["--min-offense-ppa", "NaN"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("games PPA rejects --max-offense-ppa Infinity", async () => {
  const result = await invoke(["--max-offense-ppa", "Infinity"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("games PPA: --min-defense-ppa -0.123456789 --max-defense-ppa -0.123456789", async () => {
  const result = await invoke(["--min-defense-ppa", "-0.123456789", "--max-defense-ppa", "-0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --min-defense-ppa 0 --max-defense-ppa 0", async () => {
  const result = await invoke(["--min-defense-ppa", "0", "--max-defense-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["1"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --max-defense-ppa=-0.123456789", async () => {
  const result = await invoke(["--max-defense-ppa=-0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("games PPA: --min-defense-ppa 100", async () => {
  const result = await invoke(["--min-defense-ppa", "100"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(0);
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual([]);
  expect(output.filters).toBeDefined();
});

test("games PPA rejects --min-defense-ppa 1 --max-defense-ppa 0", async () => {
  const result = await invoke(["--min-defense-ppa", "1", "--max-defense-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("games PPA rejects --min-defense-ppa NaN", async () => {
  const result = await invoke(["--min-defense-ppa", "NaN"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("games PPA rejects --max-defense-ppa Infinity", async () => {
  const result = await invoke(["--max-defense-ppa", "Infinity"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("games PPA unfiltered output preserves unavailable values, order, IDs and precision", async () => {
  const result = await invoke([]);
  expect(result.exitCode).toBe(0);
  const output = parse(result.stdout);
  expect(output.filters).toBeUndefined();
  expect(output.game_ppa.map((row: { id: string }) => row.id)).toEqual(["0", "1", "2", "missing"]);
  expect(output.game_ppa[0].offense.overall).toBe(0.123456789);
});
test("games PPA bounds retain provider scope requirements", async () => {
  const result = await invoke(["--min-offense-ppa", "0"], false);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});
test("games PPA help documents every bound without a request", async () => {
  const result = await invoke(["--help"], false);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-offense-ppa", "--max-offense-ppa", "--min-defense-ppa", "--max-defense-ppa"]) {
    expect(result.stdout).toContain(flag + " <number>");
  }
});

test("game PPA cohorts compose with game identity and all provider scopes", async () => {
  const flags = ["--week", "0", "--team", "Test", "--conference", "ACC", "--classification", "fbs",
    "--season-type", "regular", "--exclude-garbage-time", "--game-id", "9", "--opponent", " other ",
    "--min-offense-ppa", "0.123456789", "--max-offense-ppa", "0.123456789",
    "--min-defense-ppa=-0.123456789", "--max-defense-ppa=-0.123456789"];
  const result = await invoke(flags);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0, team: "Test", conference: "ACC",
    classification: "fbs", seasonType: "regular", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ game_id: 9, opponent: "other", min_offense_ppa: 0.123456789,
    max_offense_ppa: 0.123456789, min_defense_ppa: -0.123456789, max_defense_ppa: -0.123456789 });
  expect(output.count).toBe(1);
  expect(output.game_ppa[0].game_id).toBe(9);
  expect(output.game_ppa[0].offense.overall).toBe(0.123456789);
  expect(parse((await invoke([...flags, "--opponent", "Missing"])).stdout).count).toBe(0);
});

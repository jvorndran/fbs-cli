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
  const api = { async teamPpa(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  const exitCode = await runCli([...["ppa", "teams"], ...(scoped ? ["--year", "2026"] : []), ...flags], {
    api, environment: {},
    io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("teams PPA: --min-offense-ppa 0.123456789 --max-offense-ppa 0.123456789", async () => {
  const result = await invoke(["--min-offense-ppa", "0.123456789", "--max-offense-ppa", "0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --min-offense-ppa 0 --max-offense-ppa 0", async () => {
  const result = await invoke(["--min-offense-ppa", "0", "--max-offense-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["1"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --max-offense-ppa=-0.5", async () => {
  const result = await invoke(["--max-offense-ppa=-0.5"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["2"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --min-offense-ppa 100", async () => {
  const result = await invoke(["--min-offense-ppa", "100"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(0);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual([]);
  expect(output.filters).toBeDefined();
});

test("teams PPA rejects --min-offense-ppa 1 --max-offense-ppa 0", async () => {
  const result = await invoke(["--min-offense-ppa", "1", "--max-offense-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("teams PPA rejects --min-offense-ppa NaN", async () => {
  const result = await invoke(["--min-offense-ppa", "NaN"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("teams PPA rejects --max-offense-ppa Infinity", async () => {
  const result = await invoke(["--max-offense-ppa", "Infinity"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("teams PPA: --min-defense-ppa -0.123456789 --max-defense-ppa -0.123456789", async () => {
  const result = await invoke(["--min-defense-ppa", "-0.123456789", "--max-defense-ppa", "-0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --min-defense-ppa 0 --max-defense-ppa 0", async () => {
  const result = await invoke(["--min-defense-ppa", "0", "--max-defense-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["1"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --max-defense-ppa=-0.123456789", async () => {
  const result = await invoke(["--max-defense-ppa=-0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(1);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
  expect(output.filters).toBeDefined();
});

test("teams PPA: --min-defense-ppa 100", async () => {
  const result = await invoke(["--min-defense-ppa", "100"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026 }]);
  const output = parse(result.stdout);
  expect(output.count).toBe(0);
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual([]);
  expect(output.filters).toBeDefined();
});

test("teams PPA rejects --min-defense-ppa 1 --max-defense-ppa 0", async () => {
  const result = await invoke(["--min-defense-ppa", "1", "--max-defense-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("teams PPA rejects --min-defense-ppa NaN", async () => {
  const result = await invoke(["--min-defense-ppa", "NaN"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("teams PPA rejects --max-defense-ppa Infinity", async () => {
  const result = await invoke(["--max-defense-ppa", "Infinity"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("cli_parse_error");
});

test("teams PPA unfiltered output preserves unavailable values, order, IDs and precision", async () => {
  const result = await invoke([]);
  expect(result.exitCode).toBe(0);
  const output = parse(result.stdout);
  expect(output.filters).toBeUndefined();
  expect(output.team_ppa.map((row: { id: string }) => row.id)).toEqual(["0", "1", "2", "missing"]);
  expect(output.team_ppa[0].offense.overall).toBe(0.123456789);
});
test("teams PPA bounds retain provider scope requirements", async () => {
  const result = await invoke(["--min-offense-ppa", "0"], false);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});
test("teams PPA help documents every bound without a request", async () => {
  const result = await invoke(["--help"], false);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-offense-ppa", "--max-offense-ppa", "--min-defense-ppa", "--max-defense-ppa"]) {
    expect(result.stdout).toContain(flag + " <number>");
  }
});

test("team PPA cohorts combine offense and defense bounds without leaking local filters", async () => {
  const result = await invoke(["--team", "Test", "--conference", "ACC", "--classification", "fbs",
    "--exclude-garbage-time", "--min-offense-ppa", "0.123456789", "--max-offense-ppa", "0.123456789",
    "--min-defense-ppa=-0.123456789", "--max-defense-ppa=-0.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Test", conference: "ACC",
    classification: "fbs", excludeGarbageTime: true }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ min_offense_ppa: 0.123456789, max_offense_ppa: 0.123456789,
    min_defense_ppa: -0.123456789, max_defense_ppa: -0.123456789 });
  expect(output.count).toBe(1);
  expect(output.team_ppa[0].offense).toEqual({ overall: 0.123456789, passing: 99, cumulative: { total: 999 } });
  expect(output.team_ppa[0].defense.overall).toBe(-0.123456789);
});

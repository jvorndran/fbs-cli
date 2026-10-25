import { describe, expect, test } from "bun:test";
import type { GetRecruitsResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const recruits = [
  { id: "9007199254740993", name: "Jordan Smith", stars: 4, rating: 0.9456789 },
  { id: "2", name: "Sam Smith", stars: 3, rating: 0.85 },
  { id: "3", name: "José [Martin]", stars: 4 },
  { id: "4", name: null },
  { id: "5" },
] as GetRecruitsResponse;

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async recruitingPlayers(query) { calls.push(query); return recruits; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["recruiting", "players", "--year", "2026", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("recruiting player name search", () => {
  test("searches trimmed case-insensitive substrings without changing the provider query or values", async () => {
    const result = await invoke(["--name", "  SMITH  ", "--position", "QB"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2026, position: "QB" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.calls[0]);
    expect(output.filters).toEqual({ name: "SMITH" });
    expect(output.count).toBe(2);
    expect(output.recruits).toEqual(recruits.slice(0, 2));
  });

  for (const [name, ids] of [
    ["dan sm", ["9007199254740993"]], ["[martin]", ["3"]],
    ["JOSÉ", ["3"]], [".*", []], ["missing", []], ["null", []], ["undefined", []],
  ] as const) {
    test(`matches literal name text: ${name}`, async () => {
      const result = await invoke(["--name", name]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.recruits.map((row: { id: string }) => row.id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
    });
  }

  test("composes with star and rating ranges", async () => {
    const result = await invoke(["--name", "smith", "--min-stars", "4", "--max-rating", "0.95"]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.recruits).toEqual([recruits[0]]);
    expect(output.filters).toEqual({ name: "smith", min_stars: 4, max_rating: 0.95 });
    expect(result.calls).toEqual([{ year: 2026 }]);
  });

  test("no name filter retains missing names and provider order", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.recruits.map((row: { id: string }) => row.id)).toEqual(recruits.map((row) => row.id));
    expect(output.count).toBe(5);
    expect(output.filters).toBeUndefined();
  });

  test("blank names fail before any request with empty stdout", async () => {
    const result = await invoke(["--name", " \t "]);
    expect(result.exitCode).toBe(2);
    expect(result.calls).toEqual([]);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr).error.code).toBe("invalid_query");
  });

  test("help explains local name substring search", () => {
    const recruiting = createProgram().commands.find((c) => c.name() === "recruiting")!;
    const players = recruiting.commands.find((c) => c.name() === "players")!;
    expect(players.helpInformation()).toContain("--name");
    expect(players.helpInformation()).toContain("name substring");
  });
});

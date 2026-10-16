import { describe, expect, test } from "bun:test";
import type { GetRecruitsResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const recruits = [
  { id: "elite", stars: 5, rating: 0.99, ranking: 10 },
  { id: "target", stars: 4, rating: 0.9456789, ranking: 150 },
  { id: "other", stars: 3, rating: 0.85, ranking: 600 },
  { id: "unknown", stars: null, rating: null, ranking: null },
  { id: "zero", stars: 0, rating: 0, ranking: 0 },
] as GetRecruitsResponse;

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async recruitingPlayers(query) {
      calls.push(query);
      return recruits;
    },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["recruiting", "players", "--year", "2026", ...flags], {
    api: mock.api,
    environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("recruiting player ranges", () => {
  test("combines inclusive ranges without sending local filters to CFBD", async () => {
    const result = await invoke([
      "--position", "QB", "--min-stars", "4", "--max-stars", "4",
      "--min-rating", "0.94", "--max-rating", "0.9456789",
      "--min-ranking", "150", "--max-ranking", "150",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2026, position: "QB" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026, position: "QB" });
    expect(output.filters).toEqual({ min_stars: 4, max_stars: 4, min_rating: 0.94, max_rating: 0.9456789, min_ranking: 150, max_ranking: 150 });
    expect(output.count).toBe(1);
    expect(output.recruits).toEqual([recruits[1]]);
  });

  for (const [flag, value, ids] of [
    ["--max-stars", "3", ["other", "zero"]],
    ["--max-rating", "0.85", ["other", "zero"]],
    ["--min-ranking", "150", ["target", "other"]],
    ["--max-stars", "0", ["zero"]],
  ] as const) {
    test(`${flag} ${value} works alone and excludes unavailable values`, async () => {
      const result = await invoke([flag, value]);
      expect(result.exitCode).toBe(0);
      expect(parse(result.stdout).recruits.map((row: { id: string }) => row.id)).toEqual(ids);
    });
  }

  test("no local bounds preserve unknown values and provider ordering", async () => {
    const result = await invoke([]);
    const output = parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(output.count).toBe(5);
    expect(output.recruits.map((row: { id: string }) => row.id)).toEqual(recruits.map((row) => row.id));
    expect(output.filters).toBeUndefined();
  });

  for (const flags of [
    ["--min-stars", "5", "--max-stars", "4"],
    ["--min-rating", "0.95", "--max-rating", "0.9"],
    ["--min-ranking", "200", "--max-ranking", "100"],
    ["--max-stars", "-1"], ["--max-stars", "3.5"],
    ["--max-rating", "NaN"], ["--max-rating", "Infinity"],
    ["--min-ranking", "-1"], ["--min-ranking", "9007199254740992"],
  ]) {
    test(`rejects ${flags.join(" ")} before any provider request`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toEqual([]);
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("help exposes each new local bound", () => {
    const recruiting = createProgram().commands.find((command) => command.name() === "recruiting")!;
    const players = recruiting.commands.find((command) => command.name() === "players")!;
    for (const flag of ["--max-stars", "--max-rating", "--min-ranking"]) {
      expect(players.helpInformation()).toContain(flag);
    }
  });
});

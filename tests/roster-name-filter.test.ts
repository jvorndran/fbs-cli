import { describe, expect, test } from "bun:test";
import type { RosterPlayer } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows = [
  { id: "9007199254740993", firstName: "Jordan", lastName: "Smith", position: "QB", height: 74 },
  { id: "2", firstName: "Sam", lastName: "Smith", position: "WR", height: 72 },
  { id: "3", firstName: "Jean-Luc", lastName: "[Martin]", position: "QB", height: 74 },
  { id: "4", firstName: "José", lastName: "Muñoz", position: "QB" },
  { id: "5", firstName: null, lastName: null },
] as RosterPlayer[];

async function invoke(flags: string[], data = rows) {
  const requests: unknown[] = [];
  const mock = await createMockApi({ async roster(query) { requests.push(query); return data; } });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["roster", "--year", "2026", "--team", "Example", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("roster name search", () => {
  test("matches trimmed case-insensitive name substrings without changing the request or IDs", async () => {
    const result = await invoke(["--name", "  SMITH  "]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026, team: "Example" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.requests[0]);
    expect(output.filters).toEqual({ name: "SMITH" });
    expect(output.count).toBe(2);
    expect(output.players.map((p: { id: string }) => p.id)).toEqual(["9007199254740993", "2"]);
    expect(output.players[0].name).toBe("Jordan Smith");
  });

  for (const [name, ids] of [
    ["dan sm", ["9007199254740993"]], ["[martin]", ["3"]],
    ["JOSÉ", ["4"]], [".*", []], ["missing", []],
  ] as const) {
    test(`searches literal text: ${name}`, async () => {
      const result = await invoke(["--name", name]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.players.map((p: { id: string }) => p.id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
    });
  }

  test("composes name search with existing position and measurement filters", async () => {
    const result = await invoke(["--name", "smith", "--position", "qb", "--min-height", "74"]);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout).players.map((p: { id: string }) => p.id)).toEqual(["9007199254740993"]);
    expect(parse(result.stdout).filters).toEqual({ name: "smith", position: "qb", min_height: 74 });
    expect(result.requests).toEqual([{ year: 2026, team: "Example" }]);
  });

  test("omitting the search preserves all rows, including unavailable names", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout).count).toBe(5);
    expect(parse(result.stdout).filters).toBeUndefined();
  });

  test("unavailable name parts never become searchable null or undefined text", async () => {
    const data = [
      rows[4]!,
      { id: "6", firstName: undefined, lastName: "Smith" },
      { id: "7", firstName: "Actual", lastName: "Null" },
    ] as RosterPlayer[];
    const nullSearch = await invoke(["--name", "null"], data);
    expect(nullSearch.exitCode).toBe(0);
    expect(parse(nullSearch.stdout).players.map((p: { id: string }) => p.id)).toEqual(["7"]);
    expect(parse((await invoke(["--name", "undefined"], data)).stdout).count).toBe(0);
    const partialName = parse((await invoke(["--name", "smith"], data)).stdout);
    expect(partialName.players).toEqual([{ id: "6", name: "Smith" }]);
  });

  test("blank search fails before a provider call", async () => {
    const result = await invoke(["--name", "   "]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr).error.code).toBe("invalid_query");
  });

  test("help describes the local substring behavior", () => {
    const roster = createProgram().commands.find((command) => command.name() === "roster")!;
    expect(roster.helpInformation()).toContain("--name");
    expect(roster.helpInformation()).toContain("name substring");
  });
});

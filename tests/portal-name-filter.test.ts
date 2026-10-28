import { describe, expect, test } from "bun:test";
import type { GetTransferPortalResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const transfers = [
  { firstName: "Jordan", lastName: "Smith", position: "QB", origin: "Miami", stars: 4, rating: 0.9456789, transferDate: "2026-01-01T00:00:00Z" },
  { firstName: "Sam", lastName: "Smith", position: "WR", origin: "Miami", stars: 3 },
  { firstName: "José", lastName: "[Martin]", position: "QB" },
  { firstName: null, lastName: "Solo" },
  { firstName: "Only" },
  { firstName: null, lastName: null },
] as GetTransferPortalResponse;

async function invoke(flags: string[], includeYear = true) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async transferPortal(query) { calls.push(query); return transfers; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["player", "portal", ...(includeYear ? ["--year", "2026"] : []), ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("transfer portal name search", () => {
  test("matches across first and last names and composes with existing local filters", async () => {
    const result = await invoke(["--name", "  DAN SM  ", "--origin", "miami", "--position", "qb",
      "--min-stars", "4", "--max-rating", "0.95", "--from-date", "2026-01-01"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026 });
    expect(output.filters).toEqual({ name: "DAN SM", origin: "miami", position: "qb", min_stars: 4,
      max_rating: 0.95, from_date: "2026-01-01" });
    expect(output.count).toBe(1);
    expect(output.transfers[0].first_name).toBe("Jordan");
    expect(output.transfers[0].rating).toBe(0.9456789);
    expect(output.transfers[0].name).toBeUndefined();
  });

  for (const [name, firstNames] of [
    ["smith", ["Jordan", "Sam"]], ["JOSÉ [MARTIN]", ["José"]], [".*", []],
    ["Solo", [undefined]], ["Only", ["Only"]], ["null", []], ["undefined", []], ["missing", []],
  ] as const) {
    test(`matches literal combined name: ${name}`, async () => {
      const result = await invoke(["--name", name]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.transfers.map((row: { first_name?: string }) => row.first_name)).toEqual([...firstNames]);
      expect(output.count).toBe(firstNames.length);
    });
  }

  test("unfiltered output retains unavailable names in provider order", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.count).toBe(transfers.length);
    expect(output.filters).toBeUndefined();
    expect(output.transfers.map((row: { first_name?: string }) => row.first_name))
      .toEqual(["Jordan", "Sam", "José", undefined, "Only", undefined]);
  });

  test("blank names fail before requesting data", async () => {
    const result = await invoke(["--name", " \t "]);
    expect(result.exitCode).toBe(2);
    expect(result.calls).toEqual([]);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr).error.code).toBe("invalid_query");
  });

  test("name search cannot satisfy the required year", async () => {
    const result = await invoke(["--name", "smith"], false);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toEqual([]);
  });

  test("help describes the local name substring search", () => {
    const player = createProgram().commands.find((c) => c.name() === "player")!;
    const portal = player.commands.find((c) => c.name() === "portal")!;
    expect(portal.helpInformation()).toContain("--name");
    expect(portal.helpInformation()).toContain("name substring");
  });
});

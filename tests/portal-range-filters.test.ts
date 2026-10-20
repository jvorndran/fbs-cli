import { describe, expect, test } from "bun:test";
import type { GetTransferPortalResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const transfers: GetTransferPortalResponse = [
  { season: 2026, firstName: "Target", lastName: "One", position: "QB", origin: "Miami", destination: "Florida State", transferDate: "2026-01-01T00:00:00Z", eligibility: "Immediate", stars: 4, rating: 0.9456789 },
  { season: 2026, firstName: "Elite", lastName: "Two", position: "QB", origin: "Miami", destination: null, transferDate: null, eligibility: null, stars: 5, rating: 0.99 },
  { season: 2026, firstName: "Unknown", lastName: "Three", position: "WR", origin: "Miami", destination: null, transferDate: null, eligibility: null, stars: null, rating: null },
  { season: 2026, firstName: "Zero", lastName: "Four", position: "QB", origin: "Miami", destination: null, transferDate: null, eligibility: null, stars: 0, rating: 0 },
  { season: 2026, firstName: "Unrated", lastName: "Five", position: "WR", origin: "Miami", destination: null, transferDate: null, eligibility: null, stars: 4, rating: null },
];

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async transferPortal(query) { calls.push(query); return transfers; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["player", "portal", ...flags], {
    api: mock.api, environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("transfer portal rating and star ranges", () => {
  test("combines inclusive ranges with existing filters and preserves precision", async () => {
    const result = await invoke(["--year", "2026", "--origin", " miami ", "--position", "qb",
      "--from-date", "2026-01-01", "--to-date", "2026-01-01",
      "--min-rating", "0.94", "--max-rating", "0.9456789", "--min-stars", "4", "--max-stars", "4"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026 });
    expect(output.filters).toEqual({ origin: "miami", position: "qb", from_date: "2026-01-01", to_date: "2026-01-01", min_rating: 0.94, max_rating: 0.9456789, min_stars: 4, max_stars: 4 });
    expect(output.count).toBe(1);
    expect(output.transfers[0].rating).toBe(0.9456789);
    expect(output.transfers[0].first_name).toBe("Target");
  });

  for (const [flags, names] of [
    [["--max-stars", "4"], ["Target", "Zero", "Unrated"]],
    [["--max-rating", "0.9456789"], ["Target", "Zero"]],
    [["--max-stars", "0", "--max-rating", "0"], ["Zero"]],
    [["--min-rating", "1"], []],
  ] as const) {
    test(`supports ${flags.join(" ")} without sorting or matching unavailable values`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.transfers.map((row: { first_name: string }) => row.first_name)).toEqual([...names]);
      expect(output.count).toBe(names.length);
    });
  }

  test("unfiltered output retains all rows and no filter envelope", async () => {
    const result = await invoke(["--year", "2026"]);
    const output = parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(output.count).toBe(transfers.length);
    expect(output.filters).toBeUndefined();
  });

  for (const flags of [
    ["--min-stars", "5", "--max-stars", "4"],
    ["--min-rating", "0.99", "--max-rating", "0.9"],
    ["--max-stars", "-1"], ["--max-stars", "1.5"],
    ["--max-stars", "9007199254740992"], ["--max-stars", "NaN"],
    ["--max-rating", "Infinity"], ["--max-rating", "NaN"], ["--max-rating", " "],
  ]) {
    test(`rejects ${flags.join(" ")} before fetching`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toEqual([]);
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("local ranges do not satisfy the required year", async () => {
    const result = await invoke(["--max-stars", "4"]);
    expect(result.exitCode).toBe(2);
    expect(result.calls).toEqual([]);
  });

  test("help exposes local maximum bounds", () => {
    const player = createProgram().commands.find((command) => command.name() === "player")!;
    const portal = player.commands.find((command) => command.name() === "portal")!;
    expect(portal.helpInformation()).toContain("--max-stars");
    expect(portal.helpInformation()).toContain("--max-rating");
  });
});

import { describe, expect, test } from "bun:test";
import type { ExpandedTeamSRS, TeamSRS } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamSRS[] = [
  { year: 2026, team: "First", conference: "ACC", division: null, rating: 12.125, ranking: 4 },
  { year: 2026, team: "Second", conference: "ACC", division: null, rating: 12.125, ranking: 5 },
  { year: 2026, team: "Zero", conference: "ACC", division: null, rating: 0, ranking: 90 },
  { year: 2026, team: "Negative", conference: "ACC", division: null, rating: -0.125, ranking: 91 },
];

async function invoke(expanded: boolean, flags: readonly string[]) {
  const requests: unknown[] = [];
  const expandedRows: ExpandedTeamSRS[] = rows.map((row) => ({ ...row, classification: "fcs" }));
  const mock = await createMockApi({
    async srsRatings(query) { requests.push(query); return rows; },
    async expandedSrsRatings(query) { requests.push(query); return expandedRows; },
  });
  let stdout = "";
  let stderr = "";
  const path = expanded ? ["ratings", "srs", "expanded"] : ["ratings", "srs"];
  const exitCode = await runCli([...path, ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (text) => { stdout += text; }, stderr: (text) => { stderr += text; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const expanded of [false, true]) {
  const key = expanded ? "expanded_srs_ratings" : "srs_ratings";
  describe(key, () => {
    test("inclusive local bounds retain provider scopes, order, ranks and precision", async () => {
      const result = await invoke(expanded, [
        "--year", "2026", "--team", "First", "--conference", "ACC",
        ...(expanded ? ["--classification", "fcs"] : []),
        "--min-rating", "12.125", "--max-rating", "12.125",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      const query = { year: 2026, team: "First", conference: "ACC", ...(expanded ? { classification: "fcs" } : {}) };
      expect(result.requests).toEqual([query]);
      const output = parse(result.stdout);
      expect(output.query).toEqual(query);
      expect(output.filters).toEqual({ min_rating: 12.125, max_rating: 12.125 });
      expect(output[key].map((row: TeamSRS) => [row.team, row.rating, row.ranking])).toEqual([
        ["First", 12.125, 4], ["Second", 12.125, 5],
      ]);
      expect(output.count).toBe(2);
    });

    for (const [flags, teams] of [
      [["--min-rating", "12.125"], ["First", "Second"]],
      [["--max-rating", "0"], ["Zero", "Negative"]],
      [["--min-rating", "0", "--max-rating", "0"], ["Zero"]],
      [["--max-rating=-0.125"], ["Negative"]],
      [["--min-rating", "100"], []],
      [[], ["First", "Second", "Zero", "Negative"]],
    ] as const) {
      test(`supports ${flags.join(" ")} without changing the single request`, async () => {
        const result = await invoke(expanded, ["--year", "2026", ...flags]);
        expect(result.exitCode).toBe(0);
        expect(result.requests).toEqual([{ year: 2026 }]);
        const output = parse(result.stdout);
        expect(output[key].map((row: TeamSRS) => row.team)).toEqual([...teams]);
        expect(output.count).toBe(teams.length);
        if (flags.length === 0) expect(output.filters).toBeUndefined();
      });
    }

    for (const flags of [
      ["--min-rating", "2", "--max-rating", "1"], ["--min-rating", "NaN"],
      ["--max-rating", "Infinity"], ["--min-rating", " "], ["--max-rating", "bad"],
    ]) {
      test(`rejects ${flags.join(" ")} before requesting`, async () => {
        const result = await invoke(expanded, ["--year", "2026", ...flags]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toBe("");
        expect(result.requests).toEqual([]);
      });
    }

    test("bounds do not replace the required provider scope", async () => {
      const result = await invoke(expanded, ["--min-rating", "0"]);
      expect(result.exitCode).toBe(2);
      expect(result.requests).toEqual([]);
    });
  });
}

test("SRS parent bounds are inherited by expanded with explicit leaf precedence", async () => {
  const result = await invoke(false, ["--year", "2026", "--min-rating", "0", "expanded", "--min-rating", "12.125"]);
  expect(result.exitCode).toBe(0);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ min_rating: 12.125 });
  expect(output.count).toBe(2);
  expect(result.requests).toEqual([{ year: 2026 }]);
});

test("both SRS help surfaces label bounds as inclusive local filters", () => {
  const ratings = createProgram().commands.find((command) => command.name() === "ratings")!;
  const srs = ratings.commands.find((command) => command.name() === "srs")!;
  for (const command of [srs, srs.commands.find((child) => child.name() === "expanded")!]) {
    expect(command.helpInformation()).toContain("Local filter: minimum SRS rating (inclusive)");
    expect(command.helpInformation()).toContain("--max-rating");
  }
});

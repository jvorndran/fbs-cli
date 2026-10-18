import { describe, expect, test } from "bun:test";
import type { CalendarWeek } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: CalendarWeek[] = [
  { season: 2026, week: 0, seasonType: "regular", startDate: "2026-08-24T00:00:00Z", endDate: "2026-08-31T00:00:00Z", firstGameStart: "", lastGameStart: "" },
  { season: 2026, week: 1, seasonType: "regular", startDate: "2026-08-31T00:00:00Z", endDate: "2026-09-07T00:00:00Z", firstGameStart: "", lastGameStart: "" },
  { season: 2026, week: 2, seasonType: "regular", startDate: "2026-09-07T00:00:00Z", endDate: "2026-09-14T00:00:00Z", firstGameStart: "", lastGameStart: "" },
  { season: 2026, week: 1, seasonType: "postseason", startDate: "2026-12-14T00:00:00Z", endDate: "2026-12-21T00:00:00Z", firstGameStart: "", lastGameStart: "" },
];

async function invoke(flags: string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async calendar(query) {
      requests.push(query);
      return rows;
    },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["calendar", ...flags], {
    api: mock.api, environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("calendar week bounds", () => {
  test("applies inclusive bounds across season types without changing the provider query or ordering", async () => {
    const result = await invoke(["--year", "2026", "--min-week", "1", "--max-week", "1"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026 });
    expect(output.filters).toEqual({ min_week: 1, max_week: 1 });
    expect(output.count).toBe(2);
    expect(output.calendar).toEqual([1, 3].map((index) => {
      const row = rows[index]!;
      return { season: row.season, week: row.week, season_type: row.seasonType, start_date: row.startDate, end_date: row.endDate, first_game_start: "", last_game_start: "" };
    }));
  });

  for (const [flags, weeks] of [
    [["--max-week", "0"], [0]],
    [["--min-week", "2"], [2]],
    [["--min-week", "3"], []],
    [["--min-week", "0", "--max-week", "2"], [0, 1, 2, 1]],
  ] as const) {
    test(`supports ${flags.join(" ")}`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.calendar.map((row: { week: number }) => row.week)).toEqual([...weeks]);
      expect(output.count).toBe(weeks.length);
    });
  }

  test("unfiltered calendar remains unchanged", async () => {
    const result = await invoke(["--year", "2026"]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.filters).toBeUndefined();
    expect(output.count).toBe(rows.length);
    expect(output.calendar.map((row: { week: number }) => row.week)).toEqual([0, 1, 2, 1]);
  });

  for (const flags of [
    ["--min-week", "2", "--max-week", "1"],
    ["--min-week", "-1"], ["--max-week", "1.5"],
    ["--min-week", "NaN"], ["--max-week", "Infinity"],
    ["--min-week", " "], ["--max-week", "9007199254740992"],
  ]) {
    test(`rejects ${flags.join(" ")} before fetching`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
      expect(["cli_parse_error", "invalid_query"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("local bounds still require year", async () => {
    const result = await invoke(["--min-week", "0"]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
  });

  test("help identifies local inclusive bounds", () => {
    const calendar = createProgram().commands.find((command) => command.name() === "calendar")!;
    expect(calendar.helpInformation()).toContain("--min-week");
    expect(calendar.helpInformation()).toContain("--max-week");
    expect(calendar.helpInformation()).toContain("Local filter: minimum week (inclusive)");
  });
});

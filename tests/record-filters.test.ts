import { describe, expect, test } from "bun:test";
import type { TeamRecords } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const record = { games: 0, wins: 0, losses: 0, ties: 0 };
const rows: TeamRecords[] = [
  ["Unbeaten", 6, 0], ["Contender", 5, 1], ["Even", 3, 3], ["Preseason", 0, 0],
].map(([team, wins, losses]) => ({
  year: 2026, teamId: 1, team: team as string, classification: "fbs",
  conference: "ACC", division: "", expectedWins: 4.123456789,
  total: { games: Number(wins) + Number(losses), wins: Number(wins), losses: Number(losses), ties: 0 },
  conferenceGames: record, homeGames: record, awayGames: record, neutralSiteGames: record,
  regularSeason: record, postseason: record,
}));

async function invoke(flags: string[], data = rows) {
  const requests: unknown[] = [];
  const mock = await createMockApi({ async records(query) { requests.push(query); return data; } });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["records", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("record win and loss bounds", () => {
  test("combines inclusive total-record bounds with unchanged provider filters and precision", async () => {
    const result = await invoke(["--year", "2026", "--conference", "ACC", "--min-wins", "5", "--max-wins", "6", "--min-losses", "0", "--max-losses", "1"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026, conference: "ACC" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.requests[0]);
    expect(output.filters).toEqual({ min_wins: 5, max_wins: 6, min_losses: 0, max_losses: 1 });
    expect(output.count).toBe(2);
    expect(output.records.map((r: { team: string }) => r.team)).toEqual(["Unbeaten", "Contender"]);
    expect(output.records[0].expected_wins).toBe(4.123456789);
    expect(output.records[0].conference_games.wins).toBe(0);
  });

  for (const [flags, expected] of [
    [["--max-wins", "0"], ["Preseason"]],
    [["--max-losses", "0"], ["Unbeaten", "Preseason"]],
    [["--min-losses", "1"], ["Contender", "Even"]],
    [["--min-wins", "7"], []],
  ]) {
    test(`supports ${flags!.join(" ")} with stable order`, async () => {
      const result = await invoke(["--team", "Any", ...flags!]);
      expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{ team: "Any" }]);
      const output = parse(result.stdout);
      expect(output.records.map((r: { team: string }) => r.team)).toEqual(expected);
      expect(output.count).toBe(expected!.length);
    });
  }

  test("missing total measurements only fail an active bound", async () => {
    const data = [{ ...rows[0]!, total: { games: 1, losses: 0, ties: 0 } }] as TeamRecords[];
    const unfiltered = await invoke(["--year", "2026"], data);
    expect(parse(unfiltered.stdout).count).toBe(1);
    expect(parse(unfiltered.stdout).filters).toBeUndefined();
    expect(parse((await invoke(["--year", "2026", "--max-losses", "0"], data)).stdout).count).toBe(1);
    expect(parse((await invoke(["--year", "2026", "--min-wins", "0"], data)).stdout).count).toBe(0);
  });

  for (const flags of [
    ["--min-wins", "7", "--max-wins", "6"], ["--min-losses", "2", "--max-losses", "1"],
    ["--min-wins", "-1"], ["--max-losses", "1.5"], ["--max-wins", "NaN"],
    ["--min-losses", "9007199254740992"], ["--min-wins", " "],
  ]) {
    test(`rejects ${flags.join(" ")} before fetching`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.requests).toEqual([]);
      expect(result.stdout).toBe("");
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("local bounds do not replace required provider scope", async () => {
    const result = await invoke(["--min-wins", "5"]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
  });

  test("help identifies local total-record semantics", () => {
    const command = createProgram().commands.find((c) => c.name() === "records")!;
    for (const flag of ["min-wins", "max-wins", "min-losses", "max-losses"]) {
      expect(command.helpInformation()).toContain(`--${flag}`);
    }
    expect(command.helpInformation()).toContain("total-record wins (inclusive)");
  });
});

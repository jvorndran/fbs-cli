import { expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { id: "9", name: "First", averagePPA: { all: 0.123456789, pass: 99 }, totalPPA: { all: 12.3456789 } },
  { id: "2", name: "Second", averagePPA: { all: 0.123456789 }, totalPPA: { all: 12.3456789 } },
  { id: "0", name: "Zero", averagePPA: { all: 0 }, totalPPA: { all: 0 } },
  { id: "3", name: "Negative", averagePPA: { all: -0.5 }, totalPPA: { all: -50 } },
  { id: "4", name: "Missing average", totalPPA: { all: 12.3456789 } },
  { id: "5", name: "Missing total", averagePPA: { all: 0.123456789 }, totalPPA: null },
  { id: "6", name: "Null values", averagePPA: { all: null }, totalPPA: { all: null } },
  { id: "7", name: "Passing only", averagePPA: { pass: 99 }, totalPPA: { pass: 99 } },
];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = {
    async playerSeasonPpa(query: unknown) { requests.push(query); return rows; },
  } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["ppa", "players", "season", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("season PPA bounds compose with provider scopes and retain exact nested values", async () => {
  const result = await invoke([
    "--year", "2026", "--team", "Florida State", "--conference", "ACC", "--position", "QB",
    "--player-id", "9", "--threshold", "50", "--exclude-garbage-time", "--player", " first ",
    "--min-average-ppa", "0.123456789", "--max-average-ppa", "0.123456789",
    "--min-total-ppa", "12.3456789", "--max-total-ppa", "12.3456789",
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{
    year: 2026, team: "Florida State", conference: "ACC", position: "QB",
    playerId: "9", threshold: 50, excludeGarbageTime: true,
  }]);
  const output = parse(result.stdout);
  expect(output.command).toBe("ppa players season");
  expect(output.endpoint).toBe("/ppa/players/season");
  expect(output.query).toEqual({
    year: 2026, team: "Florida State", conference: "ACC", position: "QB",
    player_id: "9", threshold: 50, exclude_garbage_time: true,
  });
  expect(output.filters).toEqual({
    player: "first", min_average_ppa: 0.123456789, max_average_ppa: 0.123456789,
    min_total_ppa: 12.3456789, max_total_ppa: 12.3456789,
  });
  expect(output.count).toBe(1);
  expect(output.player_season_ppa).toEqual([{
    id: "9", name: "First", average_ppa: { all: 0.123456789, pass: 99 }, total_ppa: { all: 12.3456789 },
  }]);
});

for (const [flags, ids, filters] of [
  [["--min-average-ppa", "0.123456789", "--max-average-ppa", "0.123456789"], ["9", "2", "5"],
    { min_average_ppa: 0.123456789, max_average_ppa: 0.123456789 }],
  [["--min-total-ppa", "12.3456789", "--max-total-ppa", "12.3456789"], ["9", "2", "4"],
    { min_total_ppa: 12.3456789, max_total_ppa: 12.3456789 }],
  [["--min-average-ppa", "0", "--max-average-ppa", "0"], ["0"], { min_average_ppa: 0, max_average_ppa: 0 }],
  [["--min-total-ppa", "0", "--max-total-ppa", "0"], ["0"], { min_total_ppa: 0, max_total_ppa: 0 }],
  [["--max-average-ppa=-0.5"], ["3"], { max_average_ppa: -0.5 }],
  [["--max-total-ppa=-50"], ["3"], { max_total_ppa: -50 }],
  [["--min-average-ppa", "0.123456789", "--min-total-ppa", "12.3456789"], ["9", "2"],
    { min_average_ppa: 0.123456789, min_total_ppa: 12.3456789 }],
  [["--min-average-ppa", "100"], [], { min_average_ppa: 100 }],
  [[], ["9", "2", "0", "3", "4", "5", "6", "7"], undefined],
] as const) {
  test(`season PPA bounds: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.filters).toEqual(filters);
    expect(output.count).toBe(ids.length);
    expect(output.player_season_ppa.map((row: { id: string }) => row.id)).toEqual([...ids]);
  });
}

for (const [flags, code] of [
  [["--min-average-ppa", "1", "--max-average-ppa", "0"], "invalid_query"],
  [["--min-total-ppa", "0", "--max-total-ppa=-1"], "invalid_query"],
  [["--min-average-ppa", "NaN"], "cli_parse_error"],
  [["--max-average-ppa", "Infinity"], "cli_parse_error"],
  [["--min-total-ppa", " "], "cli_parse_error"],
  [["--max-total-ppa=-Infinity"], "cli_parse_error"],
] as const) {
  test(`invalid season PPA bounds fail before fetching: ${flags.join(" ")}`, async () => {
    const result = await invoke(["--year", "2026", ...flags]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("local bounds do not replace the required provider year or player ID", async () => {
  const result = await invoke(["--min-total-ppa", "0"]);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
});

test("a player ID alone remains a valid provider scope with local bounds", async () => {
  const result = await invoke(["--player-id", "0", "--min-total-ppa", "0", "--max-total-ppa", "0"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ playerId: "0" }]);
  expect(parse(result.stdout).player_season_ppa.map((row: { id: string }) => row.id)).toEqual(["0"]);
});

test("season PPA help exposes all four local bounds", async () => {
  const result = await invoke(["--help"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-average-ppa", "--max-average-ppa", "--min-total-ppa", "--max-total-ppa"]) {
    expect(result.stdout).toContain(`${flag} <number>`);
  }
});

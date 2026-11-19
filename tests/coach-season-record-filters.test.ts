import { expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { coachId: 9, year: 2025, wins: 10, losses: 2, winPercentage: 0.833333333, ties: 0 },
  { coachId: 2, year: 2024, wins: 10, losses: 2 },
  { coachId: 0, year: 2023, wins: 0, losses: 0 },
  { coachId: 3, wins: 11, losses: 1 },
  { coachId: 4, losses: 2 },
  { coachId: 5, wins: 10, losses: null },
  { coachId: 6, wins: null, losses: null },
];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = { async coachSeasons(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["coaches", "seasons", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("coach season record bounds compose locally and preserve records and precision", async () => {
  const result = await invoke(["--coach-id", "9", "--year", "2025", "--team", "Florida State",
    "--min-wins", "10", "--max-wins", "10", "--min-losses", "2", "--max-losses", "2"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ coachId: 9, year: 2025, team: "Florida State" }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual({ coach_id: 9, year: 2025, team: "Florida State" });
  expect(output.filters).toEqual({ min_wins: 10, max_wins: 10, min_losses: 2, max_losses: 2 });
  expect(output.count).toBe(2);
  expect(output.coach_seasons).toEqual([
    { coach_id: 9, year: 2025, wins: 10, losses: 2, win_percentage: 0.833333333, ties: 0 },
    { coach_id: 2, year: 2024, wins: 10, losses: 2 },
  ]);
});

for (const [flags, ids] of [
  [["--min-wins", "10"], [9, 2, 3, 5]],
  [["--max-wins", "0"], [0]],
  [["--min-losses", "2"], [9, 2, 4]],
  [["--max-losses", "0"], [0]],
  [["--min-wins", "99"], []],
  [[], [9, 2, 0, 3, 4, 5, 6]],
] as const) {
  test(`coach record bounds apply only to supplied fields: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{}]);
    const output = parse(result.stdout);
    expect(output.count).toBe(ids.length);
    expect(output.coach_seasons.map((row: { coach_id: number }) => row.coach_id)).toEqual([...ids]);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const [flags, code] of [
  [["--min-wins", "11", "--max-wins", "10"], "invalid_query"],
  [["--min-losses", "3", "--max-losses", "2"], "invalid_query"],
  [["--min-wins=-1"], "cli_parse_error"], [["--max-wins", "1.5"], "cli_parse_error"],
  [["--min-losses", "NaN"], "cli_parse_error"], [["--max-losses", "Infinity"], "cli_parse_error"],
  [["--max-wins", "9007199254740992"], "cli_parse_error"],
] as const) {
  test(`invalid coach record bounds fail before requesting: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("coach season help exposes all local record bounds", async () => {
  const result = await invoke(["--help"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([]);
  for (const flag of ["--min-wins", "--max-wins", "--min-losses", "--max-losses"]) {
    expect(result.stdout).toContain(`${flag} <number>`);
  }
});

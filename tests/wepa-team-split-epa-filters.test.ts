import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { teamId: 9, epa: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  { teamId: 2, epa: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  { teamId: 0, epa: { total: 0, passing: 0, rushing: 0 } },
  { teamId: 3, epa: { passing: 0.8, rushing: -0.4 } },
  { teamId: 4, epa: { rushing: 0.2 } },
  { teamId: 5, epa: { passing: -0.123456789 } },
  { teamId: 6, epa: { passing: null, rushing: null } },
  { teamId: 7, epa: null },
];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = { async wepaTeamSeason(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["wepa", "team", "season", ...flags], {
    api, environment: {},
    io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("passing and rushing EPA bounds compose without entering the provider query", async () => {
  const result = await invoke([
    "--year", "2026", "--conference", "ACC", "--team", "Florida State",
    "--min-passing-epa=-0.123456789", "--max-passing-epa=-0.123456789",
    "--min-rushing-epa=0.2", "--max-rushing-epa=0.2", "--min-epa=99",
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, conference: "ACC", team: "Florida State" }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual(result.requests[0]);
  expect(output.filters).toEqual({ min_epa: 99, min_passing_epa: -0.123456789,
    max_passing_epa: -0.123456789, min_rushing_epa: 0.2, max_rushing_epa: 0.2 });
  expect(output.count).toBe(2);
  expect(output.team_metrics).toEqual([
    { team_id: 9, epa: { total: 99, passing: -0.123456789, rushing: 0.2 } },
    { team_id: 2, epa: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  ]);
});

for (const [flags, ids] of [
  [["--min-passing-epa=0", "--max-passing-epa=0"], [0]],
  [["--max-passing-epa=0"], [9, 2, 0, 5]],
  [["--min-passing-epa=0.8"], [3]],
  [["--min-rushing-epa=0", "--max-rushing-epa=0"], [0]],
  [["--min-rushing-epa=0.2"], [9, 2, 4]],
  [["--max-rushing-epa=-0.4"], [3]],
  [["--min-rushing-epa=100"], []],
  [[], [9, 2, 0, 3, 4, 5, 6, 7]],
] as const) {
  test(`split EPA field selection: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{}]);
    const output = parse(result.stdout);
    expect(output.count).toBe(ids.length);
    expect(output.team_metrics.map((row: { team_id: number }) => row.team_id)).toEqual([...ids]);
    if (!flags.length) expect(output.filters).toBeUndefined();
  });
}

for (const [flags, code] of [
  [["--min-passing-epa=1", "--max-passing-epa=0"], "invalid_query"],
  [["--min-rushing-epa=0", "--max-rushing-epa=-1"], "invalid_query"],
  [["--min-passing-epa=NaN"], "cli_parse_error"],
  [["--max-passing-epa=Infinity"], "cli_parse_error"],
  [["--min-rushing-epa", " "], "cli_parse_error"],
  [["--max-rushing-epa=-Infinity"], "cli_parse_error"],
] as const) {
  test(`invalid split EPA bound: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("team season help exposes split EPA bounds offline", async () => {
  const result = await invoke(["--help"]);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([]);
  for (const flag of ["min-passing-epa", "max-passing-epa", "min-rushing-epa", "max-rushing-epa"]) {
    expect(result.stdout).toContain(`--${flag} <number>`);
  }
});

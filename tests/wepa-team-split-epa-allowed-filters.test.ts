import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { teamId: 9, epa: { total: 99, passing: 7 }, epaAllowed: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  { teamId: 2, epa: { total: 99, passing: 7 }, epaAllowed: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  { teamId: 0, epaAllowed: { total: 0, passing: 0, rushing: 0 } },
  { teamId: 3, epaAllowed: { passing: 0.8, rushing: -0.4 } },
  { teamId: 4, epaAllowed: { rushing: 0.2 } },
  { teamId: 5, epaAllowed: { passing: -0.123456789 } },
  { teamId: 6, epaAllowed: { passing: null, rushing: null } },
  { teamId: 7, epaAllowed: null },
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

test("passing and rushing EPA allowed bounds compose without entering the provider query", async () => {
  const result = await invoke([
    "--year", "2026", "--conference", "ACC", "--team", "Florida State",
    "--min-passing-epa-allowed=-0.123456789", "--max-passing-epa-allowed=-0.123456789",
    "--min-rushing-epa-allowed=0.2", "--max-rushing-epa-allowed=0.2", "--min-epa=99",
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, conference: "ACC", team: "Florida State" }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual(result.requests[0]);
  expect(output.filters).toEqual({ min_epa: 99, min_passing_epa_allowed: -0.123456789,
    max_passing_epa_allowed: -0.123456789, min_rushing_epa_allowed: 0.2, max_rushing_epa_allowed: 0.2 });
  expect(output.count).toBe(2);
  expect(output.team_metrics).toEqual([
    { team_id: 9, epa: { total: 99, passing: 7 }, epa_allowed: { total: 99, passing: -0.123456789, rushing: 0.2 } },
    { team_id: 2, epa: { total: 99, passing: 7 }, epa_allowed: { total: 99, passing: -0.123456789, rushing: 0.2 } },
  ]);
});

for (const [flags, ids] of [
  [["--min-passing-epa-allowed=0", "--max-passing-epa-allowed=0"], [0]],
  [["--max-passing-epa-allowed=0"], [9, 2, 0, 5]],
  [["--min-passing-epa-allowed=0.8"], [3]],
  [["--min-rushing-epa-allowed=0", "--max-rushing-epa-allowed=0"], [0]],
  [["--min-rushing-epa-allowed=0.2"], [9, 2, 4]],
  [["--max-rushing-epa-allowed=-0.4"], [3]],
  [["--min-rushing-epa-allowed=100"], []],
  [[], [9, 2, 0, 3, 4, 5, 6, 7]],
] as const) {
  test(`split EPA allowed field selection: ${flags.join(" ") || "omitted"}`, async () => {
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
  [["--min-passing-epa-allowed=1", "--max-passing-epa-allowed=0"], "invalid_query"],
  [["--min-rushing-epa-allowed=0", "--max-rushing-epa-allowed=-1"], "invalid_query"],
  [["--min-passing-epa-allowed=NaN"], "cli_parse_error"],
  [["--max-passing-epa-allowed=Infinity"], "cli_parse_error"],
  [["--min-rushing-epa-allowed", " "], "cli_parse_error"],
  [["--max-rushing-epa-allowed=-Infinity"], "cli_parse_error"],
] as const) {
  test(`invalid split EPA allowed bound: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("team season help exposes split EPA allowed bounds offline", async () => {
  const result = await invoke(["--help"]);
  expect(result.exitCode).toBe(0);
  expect(result.requests).toEqual([]);
  for (const flag of ["min-passing-epa-allowed", "max-passing-epa-allowed", "min-rushing-epa-allowed", "max-rushing-epa-allowed"]) {
    expect(result.stdout).toContain(`--${flag} <number>`);
  }
});

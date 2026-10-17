import { describe, expect, test } from "bun:test";
import type { TeamTalent } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows: TeamTalent[] = [
  { year: 2026, team: "Florida State", talent: 900.125 },
  { year: 2026, team: "Miami", talent: 900.125 },
  { year: 2026, team: "Clemson", talent: 850.05 },
  { year: 2026, team: "Zero", talent: 0 },
];

async function invoke(flags: string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async talent(query) {
      requests.push(query);
      return rows;
    },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["talent", ...flags], {
    api: mock.api, environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, requests };
}

describe("talent cohort filters", () => {
  test("combines exact team and inclusive score bounds without changing the provider query or precision", async () => {
    const result = await invoke(["--year", "2026", "--team", " florida state ", "--min-talent", "900.125", "--max-talent", "900.125"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026 });
    expect(output.filters).toEqual({ team: "florida state", min_talent: 900.125, max_talent: 900.125 });
    expect(output.count).toBe(1);
    expect(output.talent).toEqual([rows[0]]);
  });

  for (const [flags, teams] of [
    [["--min-talent", "900.125"], ["Florida State", "Miami"]],
    [["--max-talent", "0"], ["Zero"]],
    [["--min-talent", "901"], []],
    [["--max-talent", "850.05"], ["Clemson", "Zero"]],
  ] as const) {
    test(`supports ${flags.join(" ")} and retains provider ordering`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.talent.map((row: TeamTalent) => row.team)).toEqual([...teams]);
      expect(output.count).toBe(teams.length);
    });
  }

  test("unfiltered behavior is unchanged", async () => {
    const result = await invoke(["--year", "2026"]);
    const output = parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(output.talent).toEqual(rows);
    expect(output.filters).toBeUndefined();
  });

  for (const flags of [
    ["--min-talent", "901", "--max-talent", "900"],
    ["--min-talent", "NaN"], ["--max-talent", "Infinity"],
    ["--min-talent", " "], ["--team", " "],
  ]) {
    test(`rejects ${flags.join(" ")} before fetching`, async () => {
      const result = await invoke(["--year", "2026", ...flags]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
      expect(["cli_parse_error", "invalid_query"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("still requires year even with a local team filter", async () => {
    const result = await invoke(["--team", "Florida State"]);
    expect(result.exitCode).toBe(2);
    expect(result.requests).toEqual([]);
  });

  test("help identifies local inclusive bounds", () => {
    const talent = createProgram().commands.find((command) => command.name() === "talent")!;
    expect(talent.helpInformation()).toContain("--team");
    expect(talent.helpInformation()).toContain("--min-talent");
    expect(talent.helpInformation()).toContain("--max-talent");
    expect(talent.helpInformation()).toContain("Local filter: minimum talent score (inclusive)");
  });
});

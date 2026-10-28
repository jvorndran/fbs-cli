import { describe, expect, test } from "bun:test";
import type { GetDraftPicksResponse } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const picks = [
  { nflAthleteId: 1, collegeAthleteId: 0, name: "Jordan Smith", overall: 10, round: 1, height: 74.1234567 },
  { nflAthleteId: 2, name: "Sam Smith", overall: 70, round: 3 },
  { nflAthleteId: 3, name: "José [Martin]", overall: 20, round: 1 },
  { nflAthleteId: 4, name: null },
  { nflAthleteId: 5 },
] as GetDraftPicksResponse;

async function invoke(flags: string[]) {
  const calls: unknown[] = [];
  const mock = await createMockApi({
    async draftPicks(query) { calls.push(query); return picks; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["draft", "picks", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("draft pick name search", () => {
  test("composes substring search with provider and local bounds while preserving values", async () => {
    const result = await invoke(["--name", "  DAN SM  ", "--year", "2025", "--school", "Florida State",
      "--position", "QB", "--team", "Chicago", "--conference", "ACC",
      "--round", "1", "--min-overall", "10", "--max-overall", "10"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ year: 2025, school: "Florida State", position: "QB", team: "Chicago", conference: "ACC" }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual(result.calls[0]);
    expect(output.filters).toEqual({ name: "DAN SM", round: 1, min_overall: 10, max_overall: 10 });
    expect(output.count).toBe(1);
    expect(output.draft_picks).toEqual([{
      nfl_athlete_id: 1, college_athlete_id: 0, name: "Jordan Smith", overall: 10, round: 1, height: 74.1234567,
    }]);
  });

  for (const [name, ids] of [
    ["smith", [1, 2]], ["[martin]", [3]], ["JOSÉ", [3]], [".*", []],
    ["null", []], ["undefined", []], ["missing", []],
  ] as const) {
    test(`matches literal provider name: ${name}`, async () => {
      const result = await invoke(["--name", name]);
      expect(result.exitCode).toBe(0);
      expect(result.calls).toEqual([{}]);
      const output = parse(result.stdout);
      expect(output.draft_picks.map((row: { nfl_athlete_id: number }) => row.nfl_athlete_id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
    });
  }

  test("no search retains unavailable names and provider order", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.filters).toBeUndefined();
    expect(output.count).toBe(picks.length);
    expect(output.draft_picks.map((row: { nfl_athlete_id: number }) => row.nfl_athlete_id)).toEqual([1, 2, 3, 4, 5]);
  });

  for (const flags of [["--name", " \t "], ["--name", "smith", "--min-overall", "20", "--max-overall", "10"]]) {
    test(`rejects invalid local filters before requests: ${flags.join(" ")}`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toEqual([]);
      expect(parse(result.stderr).error.code).toBe("invalid_query");
    });
  }

  test("help describes the local name substring search", () => {
    const draft = createProgram().commands.find((c) => c.name() === "draft")!;
    const command = draft.commands.find((c) => c.name() === "picks")!;
    expect(command.helpInformation()).toContain("--name");
    expect(command.helpInformation()).toContain("name substring");
  });
});

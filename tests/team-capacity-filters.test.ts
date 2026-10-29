import { describe, expect, test } from "bun:test";
import type { Team } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { loadFixture } from "./helpers/fixture";
import { createMockApi } from "./helpers/mock-api";

async function invoke(path: string[], flags: string[]) {
  const [base] = await loadFixture<Team[]>("teams");
  const rows = [0, 50000, 90000, 100000, null].map((capacity, i) => ({
    ...base!, id: i, location: { ...base!.location!, capacity },
  })) as Team[];
  rows.push({ ...base!, id: 5, location: null });
  const requests: unknown[] = [];
  const handler = async (query: object) => { requests.push(query); return rows; };
  const mock = await createMockApi({ teams: handler, fbsTeams: handler });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli([...path, ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const path of [["teams"], ["teams", "fbs"]]) {
  describe(`${path.join(" ")} venue capacity`, () => {
    test("composes inclusive bounds with geography and existing provider scopes", async () => {
      const result = await invoke(path, ["--year", "2026", "--conference", "ACC", "--state", "fl",
        "--min-capacity", "50000", "--max-capacity", "90000"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.requests).toEqual([path.length === 1 ? { year: 2026, conference: "ACC" } : { year: 2026 }]);
      const output = parse(result.stdout);
      expect(output.teams.map((r: { id: number }) => r.id)).toEqual([1, 2]);
      expect(output.count).toBe(2);
      expect(output.filters).toMatchObject({ min_capacity: 50000, max_capacity: 90000, state: "fl" });
      expect(output.teams[0].location.latitude).toBe(30.4382);
    });

    for (const [flags, ids] of [
      [[], [0, 1, 2, 3, 4, 5]], [["--max-capacity", "0"], [0]],
      [["--min-capacity", "90000"], [2, 3]], [["--min-capacity", "100001"], []],
    ] as const) {
      test(`preserves zero, order and missing values for ${flags.join(" ") || "no filter"}`, async () => {
        const result = await invoke(path, [...flags]);
        expect(result.exitCode).toBe(0);
        expect(result.requests).toEqual([{}]);
        const output = parse(result.stdout);
        expect(output.teams.map((r: { id: number }) => r.id)).toEqual([...ids]);
        if (!flags.length) expect(output.filters).toBeUndefined();
      });
    }

    for (const flags of [["--min-capacity", "2", "--max-capacity", "1"], ["--min-capacity", "-1"],
      ["--max-capacity", "1.5"], ["--max-capacity", "9007199254740992"]]) {
      test(`rejects ${flags.join(" ")} before requesting`, async () => {
        const result = await invoke(path, flags);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toBe("");
        expect(result.requests).toEqual([]);
      });
    }
  });
}

test("capacity filters inherit through teams fbs and leaf values override", async () => {
  const result = await invoke(["teams", "--min-capacity", "90000", "fbs"], ["--min-capacity", "50000", "--max-capacity", "50000"]);
  expect(result.exitCode).toBe(0);
  expect(parse(result.stdout).teams.map((r: { id: number }) => r.id)).toEqual([1]);
  const inherited = await invoke(["teams", "--max-capacity", "0", "fbs"], []);
  expect(inherited.exitCode).toBe(0);
  expect(parse(inherited.stdout).count).toBe(1);
  const teams = createProgram().commands.find((c) => c.name() === "teams")!;
  for (const command of [teams, teams.commands.find((c) => c.name() === "fbs")!]) {
    expect(command.helpInformation()).toContain("--min-capacity");
    expect(command.helpInformation()).toContain("--max-capacity");
  }
});

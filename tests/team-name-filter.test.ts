import { describe, expect, test } from "bun:test";
import type { Team } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { loadFixture } from "./helpers/fixture";
import { createMockApi } from "./helpers/mock-api";

async function invoke(path: string[], flags: string[]) {
  const [base] = await loadFixture<Team[]>("teams");
  const rows = [
    { ...base!, id: 0, school: "Florida State", mascot: "Seminoles", abbreviation: "FSU", alternateNames: ["Noles"] },
    { ...base!, id: 1, school: "Florida", mascot: "Gators", abbreviation: "UF", alternateNames: ["U of F"] },
    { ...base!, id: 2, school: "A.* University", mascot: null, abbreviation: null, alternateNames: null },
    { ...base!, id: 3, school: null, mascot: null, abbreviation: null, alternateNames: null },
  ] as Team[];
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
  describe(`${path.join(" ")} name discovery`, () => {
    for (const [name, ids] of [[" florida ", [0, 1]], ["NOLES", [0]], ["fsu", [0]],
      ["U of F", [1]], ["A.*", [2]], ["missing", []]] as const) {
      test(`matches a literal school, mascot, abbreviation or alias: ${name}`, async () => {
        const result = await invoke(path, ["--name", name, "--year", "2026", "--conference", "ACC",
          "--state", "fl", "--min-capacity", "0"]);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.requests).toEqual([path.length === 1 ? { year: 2026, conference: "ACC" } : { year: 2026 }]);
        const output = parse(result.stdout);
        expect(output.teams.map((row: { id: number }) => row.id)).toEqual([...ids]);
        expect(output.count).toBe(ids.length);
        expect(output.filters.name).toBe(name.trim());
        if (ids[0] === 0) expect(output.teams[0]).toMatchObject({ school: "Florida State", alternate_names: ["Noles"] });
      });
    }

    test("retains unavailable names and original order without a search", async () => {
      const result = await invoke(path, []);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.teams.map((row: { id: number }) => row.id)).toEqual([0, 1, 2, 3]);
      expect(output.filters).toBeUndefined();
    });

    test("rejects blank names before a provider request and documents help", async () => {
      const result = await invoke(path, ["--name", " \t "]);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
      expect(parse(result.stderr).error.code).toBe("invalid_query");
      const teams = createProgram().commands.find((c) => c.name() === "teams")!;
      const command = path.length === 1 ? teams : teams.commands.find((c) => c.name() === "fbs")!;
      expect(command.helpInformation()).toContain("--name <text>");
    });
  });
}

test("teams fbs inherits a parent name search and allows a leaf override", async () => {
  const inherited = await invoke(["teams", "--name", "fsu", "fbs"], []);
  expect(inherited.exitCode).toBe(0);
  expect(parse(inherited.stdout).teams.map((row: { id: number }) => row.id)).toEqual([0]);
  const overridden = await invoke(["teams", "--name", "fsu", "fbs"], ["--name", "gators"]);
  expect(overridden.exitCode).toBe(0);
  expect(parse(overridden.stdout).teams.map((row: { id: number }) => row.id)).toEqual([1]);
});

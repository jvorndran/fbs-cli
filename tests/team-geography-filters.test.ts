import { describe, expect, test } from "bun:test";
import type { Team } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { loadFixture } from "./helpers/fixture";
import { createMockApi } from "./helpers/mock-api";

async function invoke(path: string[], flags: string[]) {
  const [base] = await loadFixture<Team[]>("teams");
  const rows: Team[] = [
    base!,
    { ...base!, id: 2, location: { ...base!.location!, city: "Miami" } },
    { ...base!, id: 3, location: { ...base!.location!, state: "GA" } },
    { ...base!, id: 4, location: null },
  ];
  const requests: unknown[] = [];
  const handler = async (query: object) => { requests.push(query); return rows; };
  const mock = await createMockApi({ teams: handler, fbsTeams: handler });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli([...path, ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const path of [["teams"], ["teams", "fbs"]]) {
  describe(`${path.join(" ")} geography`, () => {
    test("combines trimmed case-insensitive exact geography with existing filters after one unchanged request", async () => {
      const result = await invoke(path, ["--year", "2026", "--state", " fl ", "--city", "tALLAHASSEE", ...(path.length === 1 ? ["--classification", "fbs", "--conference", "ACC"] : ["--conference", "acc"])]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.requests).toEqual([path.length === 1 ? { year: 2026, conference: "ACC" } : { year: 2026 }]);
      const output = parse(result.stdout);
      expect(output.filters).toMatchObject({ state: "fl", city: "tALLAHASSEE" });
      expect(output.count).toBe(1);
      expect(output.teams).toMatchObject([{ id: 52, location: { state: "FL", city: "Tallahassee", latitude: 30.4382 } }]);
    });

    for (const [flags, ids] of [
      [["--state", "FL"], [52, 2]],
      [["--city", "Tallahassee"], [52, 3]],
      [["--state", "F"], []],
      [["--city", "missing"], []],
      [[], [52, 2, 3, 4]],
    ] as const) {
      test(`preserves provider order and missing-location semantics for ${flags.join(" ") || "no filter"}`, async () => {
        const result = await invoke(path, [...flags]);
        expect(result.exitCode).toBe(0);
        const output = parse(result.stdout);
        expect(output.teams.map((row: { id: number }) => row.id)).toEqual([...ids]);
        expect(output.count).toBe(ids.length);
        expect(result.requests).toEqual([{}]);
        if (flags.length === 0) expect(output.filters).toBeUndefined();
      });
    }

    for (const flag of ["--city", "--state"]) {
      test(`rejects blank ${flag} before any request`, async () => {
        const result = await invoke(path, [flag, " "]);
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toBe("");
        expect(result.requests).toEqual([]);
        expect(parse(result.stderr).error.code).toBe("invalid_query");
      });
    }

    test("help documents both local filters", () => {
      const teams = createProgram().commands.find((command) => command.name() === "teams")!;
      const command = path.length === 1 ? teams : teams.commands.find((command) => command.name() === "fbs")!;
      expect(command.helpInformation()).toContain("--city");
      expect(command.helpInformation()).toContain("--state");
    });
  });
}

test("FBS geography inherits parent flags and leaf values take precedence", async () => {
  const inherited = await invoke(["teams", "--state", "GA", "fbs"], []);
  expect(inherited.exitCode).toBe(0);
  expect(parse(inherited.stdout).teams.map((row: { id: number }) => row.id)).toEqual([3]);
  const overridden = await invoke(["teams", "--state", "GA", "fbs"], ["--state", "FL"]);
  expect(overridden.exitCode).toBe(0);
  expect(parse(overridden.stdout).teams.map((row: { id: number }) => row.id)).toEqual([52, 2]);
});

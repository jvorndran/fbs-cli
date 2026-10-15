import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

async function invoke(flags: string[]) {
  const mock = await createMockApi();
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["roster", "--year", "2026", "--team", "Florida State", ...flags], {
    api: mock.api,
    environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, calls: mock.calls };
}

describe("roster measurement filters", () => {
  test("combines inclusive bounds with position without changing the provider query", async () => {
    const result = await invoke([
      "--position", "qb", "--min-height", "74", "--max-height", "74",
      "--min-weight", "215", "--max-weight", "215",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toEqual([{ method: "roster", query: { year: 2026, team: "Florida State" } }]);
    const output = parse(result.stdout);
    expect(output.query).toEqual({ year: 2026, team: "Florida State" });
    expect(output.filters).toEqual({ position: "qb", min_height: 74, max_height: 74, min_weight: 215, max_weight: 215 });
    expect(output.count).toBe(1);
    expect(output.players[0]).toMatchObject({ id: "4433971", height_inches: 74, weight_lbs: 215 });
  });

  for (const [flag, value] of [["--min-height", "75"], ["--max-height", "73"], ["--min-weight", "216"], ["--max-weight", "214"]]) {
    test(`${flag} alone filters measured and unavailable rows`, async () => {
      const result = await invoke([flag!, value!]);
      expect(result.exitCode).toBe(0);
      expect(parse(result.stdout).players).toEqual([]);
      expect(parse(result.stdout).count).toBe(0);
    });
  }

  test("zero is a supplied bound; unknown measurements do not qualify", async () => {
    const result = await invoke(["--min-height", "0", "--min-weight", "0"]);
    expect(result.exitCode).toBe(0);
    expect(parse(result.stdout).count).toBe(1);
    expect(parse(result.stdout).filters).toEqual({ min_height: 0, min_weight: 0 });
  });

  test("unfiltered output retains players with missing measurements and large string IDs", async () => {
    const result = await invoke([]);
    const output = parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(output.count).toBe(2);
    expect(output.players[1].id).toBe("9007199254740993");
    expect(output.filters).toBeUndefined();
  });

  for (const flags of [
    ["--min-height", "75", "--max-height", "74"],
    ["--min-weight", "216", "--max-weight", "215"],
    ["--min-height", "-1"], ["--max-weight", "NaN"],
    ["--min-weight", "215.5"], ["--max-height", "9007199254740992"],
  ]) {
    test(`rejects ${flags.join(" ")} before any provider request`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toEqual([]);
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("help states both measurement units and local behavior", () => {
    const roster = createProgram().commands.find((command) => command.name() === "roster")!;
    expect(roster.helpInformation()).toContain("--min-height");
    expect(roster.helpInformation()).toContain("inches");
    expect(roster.helpInformation()).toContain("pounds");
  });
});

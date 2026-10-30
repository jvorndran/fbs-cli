import { describe, expect, test } from "bun:test";
import type { Venue } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const venue = (id: number, name: string | null, state = "FL"): Venue => ({
  id, name, state, capacity: 50000, city: "City", zip: null,
  countryCode: "US", timezone: null, latitude: 30.43823456789, longitude: null,
  elevation: null, constructionYear: null, grass: true, dome: false,
});

async function invoke(flags: string[]) {
  let calls = 0;
  const mock = await createMockApi({ async venues() {
    calls += 1;
    return [venue(0, "Doak Campbell Stadium"), venue(1, "Other Stadium"),
      venue(2, "[A.*] Field"), venue(3, "José Field", "GA"), venue(4, null)];
  } });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["venues", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("venue name search", () => {
  for (const [name, ids] of [[" STADIUM ", [0, 1]], ["campbell", [0]],
    ["[a.*]", [2]], ["JOSÉ", [3]], ["null", []], ["missing", []]] as const) {
    test(`matches trimmed literal substrings: ${name}`, async () => {
      const result = await invoke(["--name", name]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.calls).toBe(1);
      const output = parse(result.stdout);
      expect(output.query).toEqual({});
      expect(output.filters).toEqual({ name: name.trim() });
      expect(output.venues.map((row: { id: number }) => row.id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
    });
  }

  test("composes with geography, capacity and booleans while retaining IDs and precision", async () => {
    const result = await invoke(["--name", "stadium", "--state", "fl", "--city", "city",
      "--min-capacity", "50000", "--max-capacity", "50000", "--dome", "false"]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.venues.map((row: { id: number }) => row.id)).toEqual([0, 1]);
    expect(output.venues[0]).toMatchObject({ id: 0, name: "Doak Campbell Stadium", latitude: 30.43823456789, dome: false });
    expect(output.filters.name).toBe("stadium");
    expect(output.query).toEqual({});
    expect(result.calls).toBe(1);
  });

  test("omitting search retains all rows including unavailable names", async () => {
    const result = await invoke([]);
    expect(result.exitCode).toBe(0);
    const output = parse(result.stdout);
    expect(output.venues.map((row: { id: number }) => row.id)).toEqual([0, 1, 2, 3, 4]);
    expect(output.filters).toBeUndefined();
  });

  test("blank searches fail before requests and help documents substring matching", async () => {
    const result = await invoke(["--name", " \t "]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.calls).toBe(0);
    expect(parse(result.stderr).error.code).toBe("invalid_query");
    const command = createProgram().commands.find((c) => c.name() === "venues")!;
    expect(command.helpInformation()).toContain("--name <text>");
    expect(command.helpInformation()).toContain("name substring");
  });
});

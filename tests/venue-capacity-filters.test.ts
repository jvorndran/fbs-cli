import { describe, expect, test } from "bun:test";
import type { Venue } from "cfbd";
import { parse } from "yaml";

import { createProgram, runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const venue = (id: number, capacity: number | null, state = "FL"): Venue => ({
  id, capacity, state, name: `Stadium ${id}`, city: "City", zip: null,
  countryCode: "US", timezone: null, latitude: null, longitude: null,
  elevation: null, constructionYear: null, grass: true, dome: false,
});

async function invoke(flags: string[]) {
  let calls = 0;
  const mock = await createMockApi({
    async venues() {
      calls += 1;
      return [venue(1, 0), venue(2, 50000), venue(3, 80000), venue(4, null), venue(5, 50000, "GA")];
    },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["venues", ...flags], {
    api: mock.api,
    environment: {},
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });
  return { exitCode, stdout, stderr, calls };
}

describe("venue capacity filters", () => {
  test("combines inclusive bounds and existing filters after one query-free request", async () => {
    const result = await invoke(["--min-capacity", "50000", "--max-capacity", "50000", "--state", "fl", "--dome", "false"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.calls).toBe(1);
    const output = parse(result.stdout);
    expect(output.query).toEqual({});
    expect(output.filters).toEqual({ min_capacity: 50000, max_capacity: 50000, state: "fl", dome: false });
    expect(output.count).toBe(1);
    expect(output.venues).toMatchObject([{ id: 2, capacity: 50000, dome: false }]);
  });

  for (const [flags, ids] of [
    [["--min-capacity", "80000"], [3]],
    [["--max-capacity", "0"], [1]],
    [["--min-capacity", "0"], [1, 2, 3, 5]],
    [["--min-capacity", "90000"], []],
  ] as const) {
    test(`supports ${flags.join(" ")} and excludes unavailable capacity`, async () => {
      const result = await invoke([...flags]);
      expect(result.exitCode).toBe(0);
      const output = parse(result.stdout);
      expect(output.venues.map((row: Venue) => row.id)).toEqual([...ids]);
      expect(output.count).toBe(ids.length);
    });
  }

  test("unfiltered output retains unknown capacity and has no filters field", async () => {
    const result = await invoke([]);
    const output = parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(output.count).toBe(5);
    expect(output.venues[3].id).toBe(4);
    expect(output.venues[3].capacity).toBeUndefined();
    expect(output.filters).toBeUndefined();
  });

  for (const flags of [
    ["--min-capacity", "50001", "--max-capacity", "50000"],
    ["--min-capacity", "-1"], ["--max-capacity", "1.5"],
    ["--min-capacity", "NaN"], ["--max-capacity", "9007199254740992"],
  ]) {
    test(`rejects ${flags.join(" ")} before a provider request`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.calls).toBe(0);
      expect(["invalid_query", "cli_parse_error"]).toContain(parse(result.stderr).error.code);
    });
  }

  test("help describes both bounds as local and inclusive", () => {
    const venues = createProgram().commands.find((command) => command.name() === "venues")!;
    expect(venues.helpInformation()).toContain("--min-capacity");
    expect(venues.helpInformation()).toContain("--max-capacity");
    expect(venues.helpInformation()).toContain("Local filter: minimum seating capacity (inclusive)");
  });
});

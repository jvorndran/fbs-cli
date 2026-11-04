import { expect, test } from "bun:test";
import type { ConferenceSP } from "cfbd";
import { parse } from "yaml";

import { runCli } from "../src/index";
import { createMockApi } from "./helpers/mock-api";

const rows = [
  { year: 2026, conference: "ACC", rating: 10.123456789 },
  { year: 2026, conference: "SEC", rating: 10.123456789 },
  { year: 2026, conference: "Zero", rating: 0 },
  { year: 2026, conference: "Negative", rating: -0.125 },
] as ConferenceSP[];

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const mock = await createMockApi({
    async conferenceSpRatings(query) { requests.push(query); return rows; },
  });
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["ratings", "sp", "conferences", ...flags], {
    api: mock.api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("conference bounds stay local and retain provider order, ties and precision", async () => {
  const result = await invoke(["--year", "2026", "--conference", "ACC", "--classification", "fbs",
    "--min-rating", "10.123456789", "--max-rating", "10.123456789"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, conference: "ACC", classification: "fbs" }]);
  const output = parse(result.stdout);
  expect(output.filters).toEqual({ min_rating: 10.123456789, max_rating: 10.123456789 });
  expect(output.conference_sp_ratings).toEqual(rows.slice(0, 2));
  expect(output.count).toBe(2);
});

for (const [flags, names] of [
  [["--min-rating", "0", "--max-rating", "0"], ["Zero"]],
  [["--max-rating=-0.125"], ["Negative"]],
  [["--min-rating", "100"], []],
  [[], ["ACC", "SEC", "Zero", "Negative"]],
] as const) {
  test(`conference rating bounds: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.requests).toEqual([{}]);
    const output = parse(result.stdout);
    expect(output.conference_sp_ratings.map((row: ConferenceSP) => row.conference)).toEqual([...names]);
    expect(output.count).toBe(names.length);
    if (flags.length === 0) expect(output.filters).toBeUndefined();
  });
}

for (const flags of [
  ["--min-rating", "2", "--max-rating", "1"], ["--min-rating", "NaN"],
  ["--max-rating", "Infinity"], ["--min-rating", " "],
]) {
  test(`invalid conference bounds fail before a request: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

test("conference leaf inherits matching parent bounds while leaf values win", async () => {
  const mock = await createMockApi({ async conferenceSpRatings() { return rows; } });
  let stdout = "";
  const exitCode = await runCli(["ratings", "sp", "--min-rating", "1", "conferences",
    "--min-rating", "0", "--max-rating", "0"], {
    api: mock.api, environment: {}, io: { stdout: (value) => { stdout += value; }, stderr: () => {} },
  });
  expect(exitCode).toBe(0);
  expect(parse(stdout).conference_sp_ratings).toEqual([rows[2]]);
});

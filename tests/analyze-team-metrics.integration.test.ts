import { expect, test } from "bun:test";
import { parse } from "yaml";

import { runCli } from "../src/index.ts";
import {
  createAnalysisMetricFixture,
  EXPECTED_COMPLETE_ANALYSIS,
} from "./helpers/analysis-metric-fixture.ts";

test("analyze team calculates every public metric from endpoint responses", async () => {
  const fixture = createAnalysisMetricFixture();
  let stdout = "";
  let stderr = "";

  const exitCode = await runCli([
    "analyze",
    "team",
    "--year",
    "2026",
    "--team",
    "Florida State",
    "--as-of",
    "2026-10-01T00:00:00Z",
  ], {
    api: fixture.api,
    environment: { FBS_MAX_OUTPUT_CHARS: "0" },
    io: {
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
    },
  });

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(parse(stdout)).toEqual(EXPECTED_COMPLETE_ANALYSIS);
  expect(fixture.calls).toEqual([
    { method: "games", query: { year: 2026, seasonType: "both", classification: "fbs" } },
    { method: "plays", query: { year: 2026, week: 1, seasonType: "both", classification: "fbs" } },
    { method: "playTypes", query: {} },
    { method: "drives", query: { year: 2026, team: "Florida State", seasonType: "both", classification: "fbs" } },
    { method: "gamePlayerStats", query: { year: 2026, team: "Florida State", seasonType: "both", classification: "fbs" } },
    { method: "advancedGameStats", query: { year: 2026, team: "Florida State", seasonType: "both" } },
    { method: "gameHavocStats", query: { year: 2026, team: "Florida State", seasonType: "both" } },
  ]);
});

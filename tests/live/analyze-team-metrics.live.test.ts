import { beforeAll, describe, expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../../src/cfbd/api.ts";
import { createCfbdApi } from "../../src/cfbd/api.ts";
import { resolveCredential } from "../../src/config.ts";
import { runCli } from "../../src/index.ts";
import {
  buildLiveAnalysisOracle,
  type CapturedAnalysisResponses,
} from "../helpers/analysis-live-oracle.ts";

const liveEnabled = process.env.CFBD_LIVE_TESTS === "1";
const TEAM = "Florida State";
const YEAR = 2023;
const AS_OF = "2023-09-25T00:00:00Z";

function recordingApi(
  api: CfbdApi,
  captured: CapturedAnalysisResponses,
): CfbdApi {
  return new Proxy(api, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || typeof value !== "function") return value;
      return async (query: Record<string, unknown> = {}) => {
        const response: unknown = await value(query);
        if (!Array.isArray(response)) {
          throw new Error(`Expected ${property} to return an array during live analysis.`);
        }
        const calls = captured.get(property) ?? [];
        calls.push(response);
        captured.set(property, calls);
        return response;
      };
    },
  });
}

if (!liveEnabled) {
  test.skip(
    "live analyze-team metric integration requires CFBD_LIVE_TESTS=1 (10 API calls)",
    () => {},
  );
} else {
  describe("live analyze-team calculated metrics (10 API calls)", () => {
    let apiKey = "";

    beforeAll(async () => {
      const credential = await resolveCredential({
        environment: process.env,
        workingDirectory: `${import.meta.dir}/../..`,
      });
      apiKey = credential.apiKey;
    });

    test("matches an independent oracle over the exact real CFBD responses", async () => {
      const captured: CapturedAnalysisResponses = new Map();
      const api = recordingApi(createCfbdApi(apiKey), captured);
      let stdout = "";
      let stderr = "";
      const exitCode = await runCli([
        "analyze",
        "team",
        "--year",
        String(YEAR),
        "--team",
        TEAM,
        "--as-of",
        AS_OF,
      ], {
        api,
        environment: { FBS_MAX_OUTPUT_CHARS: "0" },
        io: {
          stdout: (value) => { stdout += value; },
          stderr: (value) => { stderr += value; },
        },
      });

      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
      const output = parse(stdout) as Record<string, any>;
      expect(output.analysis).not.toHaveProperty("unavailable_metrics");

      const oracle = buildLiveAnalysisOracle({
        captured,
        team: TEAM,
        year: YEAR,
        asOf: AS_OF,
        classification: "fbs",
      });
      expect(output.games).toEqual(oracle.games);
      expect(output.analysis).toEqual(oracle.analysis);
      expect(
        [...captured.values()].reduce((sum, responses) => sum + responses.length, 0),
      ).toBe(10);
    }, 120_000);
  });
}

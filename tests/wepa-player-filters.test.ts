import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [-0.123456789, -0.123456789, 0, null, -0.123456789].map((wepa, i) => ({
  athleteId: String(i), athleteName: i === 4 ? "Other" : "Example", plays: 30, wepa,
}));

for (const [kind, adapter] of [["passing", "wepaPassing"], ["rushing", "wepaRushing"]] as const) {
  async function invoke(flags: readonly string[]) {
    const requests: unknown[] = [];
    const api = {
      async [adapter](query: unknown) { requests.push(query); return rows; },
    } as unknown as CfbdApi;
    let stdout = "";
    let stderr = "";
    const exitCode = await runCli(["wepa", "players", kind, "--year", "2025", ...flags], {
      api, environment: {},
      io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
    });
    return { exitCode, stdout, stderr, requests };
  }

  for (const [flags, ids, filters] of [
    [
      ["--min-wepa=-0.123456789", "--max-wepa=-0.123456789", "--player", "Example", "--min-plays", "30"],
      ["0", "1"], { min_wepa: -0.123456789, max_wepa: -0.123456789, player: "Example", min_plays: 30 },
    ],
    [["--min-wepa", "0"], ["2"], { min_wepa: 0 }],
    [["--max-wepa=-0.1"], ["0", "1", "4"], { max_wepa: -0.1 }],
    [[], ["0", "1", "2", "3", "4"], undefined],
  ] as const) {
    test(`${kind} WEPA: ${flags.join(" ") || "omitted"}`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.requests).toEqual([{ year: 2025 }]);
      const output = parse(result.stdout);
      expect(output.filters).toEqual(filters);
      expect(output.count).toBe(ids.length);
      expect(output.player_metrics.map((row: { athlete_id: string }) => row.athlete_id)).toEqual(ids);
      expect(output.player_metrics[0].wepa).toBe(ids[0] === "2" ? 0 : -0.123456789);
    });
  }

  for (const flags of [["--min-wepa", "0", "--max-wepa=-1"], ["--max-wepa", "Infinity"]]) {
    test(`${kind} rejects invalid WEPA bounds before requesting data: ${flags.join(" ")}`, async () => {
      const result = await invoke(flags);
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]);
    });
  }
}

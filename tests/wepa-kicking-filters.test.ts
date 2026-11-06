import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [-0.7654321, -0.7654321, 0, null, -0.7654321].map((paar, i) => ({
  athleteId: String(i), athleteName: "Example", attempts: i === 4 ? 4 : 10, paar,
}));

async function invoke(flags: readonly string[]) {
  const requests: unknown[] = [];
  const api = {
    async wepaKicking(query: unknown) { requests.push(query); return rows; },
  } as unknown as CfbdApi;
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["wepa", "players", "kicking", "--year", "2025", ...flags], {
    api, environment: {},
    io: { stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const [flags, ids, filters] of [
  [
    ["--min-paar=-0.7654321", "--max-paar=-0.7654321", "--player", "Example", "--min-attempts", "10"],
    ["0", "1"], { min_paar: -0.7654321, max_paar: -0.7654321, player: "Example", min_attempts: 10 },
  ],
  [["--min-paar", "0"], ["2"], { min_paar: 0 }],
  [["--max-paar=-0.5"], ["0", "1", "4"], { max_paar: -0.5 }],
  [[], ["0", "1", "2", "3", "4"], undefined],
] as const) {
  test(`kicker PAAR: ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2025 }]);
    const output = parse(result.stdout);
    expect(output.filters).toEqual(filters);
    expect(output.count).toBe(ids.length);
    expect(output.kicker_ratings.map((row: { athlete_id: string }) => row.athlete_id)).toEqual(ids);
    expect(output.kicker_ratings[0].paar).toBe(ids[0] === "2" ? 0 : -0.7654321);
  });
}

for (const flags of [["--min-paar", "0", "--max-paar=-1"], ["--max-paar", "Infinity"]]) {
  test(`kicking rejects invalid PAAR bounds before requesting data: ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
  });
}

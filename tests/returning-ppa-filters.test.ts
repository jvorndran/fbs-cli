import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const metrics = [
  ["total-ppa", "totalPPA", "total_ppa"],
  ["total-passing-ppa", "totalPassingPPA", "total_passing_ppa"],
  ["total-receiving-ppa", "totalReceivingPPA", "total_receiving_ppa"],
  ["total-rushing-ppa", "totalRushingPPA", "total_rushing_ppa"],
] as const;

async function invoke(flags: string[], rows: unknown[] = []) {
  const requests: unknown[] = [];
  const api = { async returningProduction(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "", stderr = "";
  const exitCode = await runCli(["player", "returning", ...flags], {
    api, environment: {}, io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const [flag, field, output] of metrics) {
  test(`returning ${flag} bounds include signed endpoints and zero, reject missing, retain precision`, async () => {
    const rows = [
      { team: "negative", [field]: -1.123456789, usage: 0.75 },
      { team: "zero", [field]: 0, usage: 0.75 },
      { team: "positive", [field]: 2.987654321, usage: 0.75 },
      { team: "null", [field]: null }, { team: "absent" },
    ];
    const result = await invoke(["--year=2026", `--min-${flag}=-1.123456789`, `--max-${flag}=0`], rows);
    expect(result.exitCode).toBe(0); expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const doc = parse(result.stdout);
    expect(doc.returning_production.map((r: { team: string }) => r.team)).toEqual(["negative", "zero"]);
    expect(doc.count).toBe(2);
    expect(doc.returning_production[0][output]).toBe(-1.123456789);
    expect(doc.returning_production[1][output]).toBe(0);
    expect(doc.filters).toEqual({ [`min_${output}`]: -1.123456789, [`max_${output}`]: 0 });
    const upper = await invoke(["--team=Example", `--min-${flag}=2.987654321`], rows);
    expect(upper.exitCode).toBe(0); expect(upper.requests).toEqual([{ team: "Example" }]);
    expect(parse(upper.stdout).returning_production.map((r: { team: string }) => r.team)).toEqual(["positive"]);
    const exact = await invoke(["--year=2026", `--min-${flag}=0`, `--max-${flag}=0`], rows);
    expect(exact.exitCode).toBe(0); expect(parse(exact.stdout).count).toBe(1);
    const maximumOnly = await invoke(["--year=2026", `--max-${flag}=0`], rows);
    expect(maximumOnly.exitCode).toBe(0); expect(parse(maximumOnly.stdout).count).toBe(2);
    const unfiltered = await invoke(["--year=2026"], rows);
    expect(unfiltered.exitCode).toBe(0); expect(parse(unfiltered.stdout).count).toBe(5);
    expect(parse(unfiltered.stdout).filters).toBeUndefined();
  });
  for (const bounds of [[`--min-${flag}=1`, `--max-${flag}=-1`], [`--min-${flag}=NaN`], [`--max-${flag}=Infinity`]]) {
    test(`returning PPA rejects ${bounds.join(" ")} before a request`, async () => {
      const result = await invoke(["--year=2026", ...bounds]);
      expect(result.exitCode).toBe(2); expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]); expect(parse(result.stderr).error).toBeDefined();
    });
  }
}

test("returning PPA bounds compose across metrics, usage and provider scopes", async () => {
  const rows = [
    { team: "match", totalPPA: 10, totalPassingPPA: -2, totalReceivingPPA: 3, totalRushingPPA: 9,
      usage: 0.7, passingUsage: 0.5, rushingUsage: 0.8 },
    { team: "wrong usage", totalPPA: 10, totalPassingPPA: -2, totalReceivingPPA: 3, totalRushingPPA: 9, usage: 0.1 },
    { team: "wrong metric", totalPPA: 10, totalPassingPPA: -2, totalReceivingPPA: 2, totalRushingPPA: 9,
      usage: 0.7, passingUsage: 0.5, rushingUsage: 0.8 },
  ];
  const result = await invoke(["--year=2026", "--team=Example", "--conference=ACC", "--min-total-ppa=10",
    "--max-total-passing-ppa=-2", "--min-total-receiving-ppa=3", "--max-total-rushing-ppa=9",
    "--min-usage=0.5", "--min-passing-usage=0.5", "--max-rushing-usage=0.8"], rows);
  expect(result.exitCode).toBe(0); expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", conference: "ACC" }]);
  const doc = parse(result.stdout);
  expect(doc.query).toEqual({ year: 2026, team: "Example", conference: "ACC" });
  expect(doc.returning_production.map((r: { team: string }) => r.team)).toEqual(["match"]);
  expect(doc.count).toBe(1); expect(doc.filters.min_total_receiving_ppa).toBe(3);
});

test("returning PPA still requires scope and exposes all bounds in help", async () => {
  const missing = await invoke(["--min-total-ppa=0"]);
  expect(missing.exitCode).toBe(2); expect(missing.stdout).toBe(""); expect(missing.requests).toEqual([]);
  const help = await invoke(["--help"]); expect(help.exitCode).toBe(0); expect(help.requests).toEqual([]);
  for (const [flag] of metrics) for (const prefix of ["min", "max"]) {
    expect(help.stdout).toContain(`--${prefix}-${flag} <number>`);
  }
});

import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

async function invoke(flags: string[], rows: unknown[] = []) {
  const requests: unknown[] = [];
  const api = { async recruitingPlayers(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "", stderr = "";
  const exitCode = await runCli(["recruiting", "players", ...flags], {
    api, environment: {}, io: { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
  });
  return { exitCode, stdout, stderr, requests };
}

for (const field of ["height", "weight"]) {
  test(`recruit ${field} bounds preserve endpoints, precision, zero and missing-field semantics`, async () => {
    const rows = [{ id: "1", [field]: 0 }, { id: "2", [field]: 72.125 },
      { id: "3", [field]: 73.5 }, { id: "4", [field]: null }, { id: "5" }];
    const result = await invoke(["--year=2026", `--min-${field}=0`, `--max-${field}=72.125`], rows);
    expect(result.exitCode).toBe(0); expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026 }]);
    const doc = parse(result.stdout);
    expect(doc.recruits.map((row: { id: string }) => row.id)).toEqual(["1", "2"]);
    expect(doc.recruits[1][field]).toBe(72.125); expect(doc.recruits[0][field]).toBe(0);
    expect(doc.filters).toEqual({ [`min_${field}`]: 0, [`max_${field}`]: 72.125 });
    for (const [bounds, ids] of [
      [[`--max-${field}=0`], ["1"]], [[`--min-${field}=72.125`], ["2", "3"]],
      [[`--min-${field}=72.125`, `--max-${field}=72.125`], ["2"]], [[], ["1", "2", "3", "4", "5"]],
    ] as [string[], string[]][]) {
      const one = await invoke(["--team=Example", ...bounds], rows);
      expect(one.exitCode).toBe(0); expect(one.requests).toEqual([{ team: "Example" }]);
      expect(parse(one.stdout).recruits.map((row: { id: string }) => row.id)).toEqual(ids);
      expect(parse(one.stdout).count).toBe(ids.length);
      if (!bounds.length) expect(parse(one.stdout).filters).toBeUndefined();
    }
  });
  for (const bounds of [[`--min-${field}=74`, `--max-${field}=72`], [`--min-${field}=-1`],
    [`--max-${field}=-0.5`], [`--min-${field}=NaN`], [`--max-${field}=Infinity`]]) {
    test(`invalid recruit size bounds ${bounds.join(" ")} fail before fetching`, async () => {
      const result = await invoke(["--year=2026", ...bounds]);
      expect(result.exitCode).toBe(2); expect(result.stdout).toBe("");
      expect(result.requests).toEqual([]); expect(parse(result.stderr).error).toBeDefined();
    });
  }
}

test("recruit size composes with name, ratings and provider scope without altering query", async () => {
  const rows = [
    { id: "ok", name: "A Smith", height: 74, weight: 220, stars: 4 },
    { id: "short", name: "B Smith", height: 70, weight: 220, stars: 4 },
    { id: "light", name: "C Smith", height: 74, weight: 180, stars: 4 },
    { id: "stars", name: "D Smith", height: 74, weight: 220, stars: 2 },
    { id: "name", name: "Other", height: 74, weight: 220, stars: 4 },
  ];
  const result = await invoke(["--year=2026", "--team=Example", "--position=LB", "--state=FL",
    "--name=smith", "--min-stars=3", "--min-height=72", "--max-height=76", "--min-weight=200", "--max-weight=240"], rows);
  expect(result.exitCode).toBe(0); expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, team: "Example", position: "LB", state: "FL" }]);
  expect(parse(result.stdout).recruits.map((row: { id: string }) => row.id)).toEqual(["ok"]);
  expect(parse(result.stdout).filters).toEqual({ name: "smith", min_stars: 3,
    min_height: 72, max_height: 76, min_weight: 200, max_weight: 240 });
});

test("size bounds retain required scope and appear in endpoint help", async () => {
  const missing = await invoke(["--min-height=72"]);
  expect(missing.exitCode).toBe(2); expect(missing.requests).toEqual([]); expect(missing.stdout).toBe("");
  const help = await invoke(["--help"]); expect(help.exitCode).toBe(0);
  for (const field of ["height", "weight"]) for (const prefix of ["min", "max"]) {
    expect(help.stdout).toContain(`--${prefix}-${field} <number>`);
  }
});

import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  { all: 0.8, pass: 0.123456789, rush: -0.25 },
  { all: 0.8, pass: 0.123456789, rush: -0.25 },
  { all: 0, pass: 0, rush: 0 },
  { all: -0.5, pass: -0.5, rush: 1 },
  { all: 0.8 },
  { all: 0.8, pass: null, rush: null },
].map((averagePPA, i) => ({ id: `900719925474099${i}`, name: "Player", opponent: "Other", averagePPA }));

async function invoke(flags: readonly string[], scope = true) {
  const requests: unknown[] = [];
  const api = { async playerGamePpa(query: unknown) { requests.push(query); return rows; } } as unknown as CfbdApi;
  let stdout = "", stderr = "";
  const exitCode = await runCli(["ppa", "players", "games", ...(scope ? ["--year", "2026", "--week", "0"] : []), ...flags], {
    api, environment: {},
    io: { stdout: v => { stdout += v; }, stderr: v => { stderr += v; } },
  });
  return { exitCode, stdout, stderr, requests };
}

test("games average split PPA bounds compose without altering requests or precision", async () => {
  const result = await invoke(["--min-pass-ppa", "0.123456789", "--max-pass-ppa", "0.123456789",
    "--min-rush-ppa=-0.25", "--max-rush-ppa=-0.25", "--min-average-ppa", "0.8", "--player", " player "]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
  const output = parse(result.stdout);
  expect(output.query).toEqual({ year: 2026, week: 0 });
  expect(output.filters).toEqual({ player: "player", min_average_ppa: 0.8,
    min_pass_ppa: 0.123456789, max_pass_ppa: 0.123456789, min_rush_ppa: -0.25, max_rush_ppa: -0.25 });
  expect(output.count).toBe(2);
  expect(output.player_game_ppa.map((r: { id: string }) => r.id)).toEqual([rows[0]!.id, rows[1]!.id]);
  expect(output.player_game_ppa[0].average_ppa).toEqual(rows[0]!.averagePPA);
});

for (const [flags, ids] of [
  [["--min-pass-ppa", "0", "--max-pass-ppa", "0"], [2]],
  [["--max-pass-ppa=-0.5"], [3]],
  [["--min-rush-ppa", "0", "--max-rush-ppa", "0"], [2]],
  [["--min-rush-ppa", "1"], [3]],
  [["--min-pass-ppa", "100"], []],
  [["--min-pass-ppa", "0"], [0, 1, 2]],
  [[], [0, 1, 2, 3, 4, 5]],
] as const) {
  test(`games split PPA selection ${flags.join(" ") || "omitted"}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.requests).toEqual([{ year: 2026, week: 0 }]);
    const output = parse(result.stdout);
    expect(output.count).toBe(ids.length);
    expect(output.player_game_ppa.map((r: { id: string }) => r.id)).toEqual(ids.map(i => rows[i]!.id));
    if (!flags.length) expect(output.filters).toBeUndefined();
  });
}

for (const [flags, code] of [
  [["--min-pass-ppa", "1", "--max-pass-ppa", "0"], "invalid_query"],
  [["--min-rush-ppa", "0", "--max-rush-ppa=-1"], "invalid_query"],
  [["--min-pass-ppa", "NaN"], "cli_parse_error"],
  [["--max-pass-ppa", "Infinity"], "cli_parse_error"],
  [["--min-rush-ppa", " "], "cli_parse_error"],
  [["--max-rush-ppa=-Infinity"], "cli_parse_error"],
] as const) {
  test(`games invalid split PPA ${flags.join(" ")}`, async () => {
    const result = await invoke(flags);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}

test("games split PPA bounds retain scope requirements and expose help", async () => {
  const result = await invoke(["--min-pass-ppa", "0"], false);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.requests).toEqual([]);
  expect(parse(result.stderr).error.code).toBe("invalid_query");
  const help = await invoke(["--help"], false);
  expect(help.exitCode).toBe(0);
  expect(help.requests).toEqual([]);
  for (const flag of ["min-pass", "max-pass", "min-rush", "max-rush"]) {
    expect(help.stdout).toContain(`--${flag}-ppa <number>`);
  }
});


import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

const workspace = `${import.meta.dir}/..`;

interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function spawnBun(args: readonly string[]): Promise<ProcessResult> {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: workspace,
    env: {
      ...process.env,
      CFBD_API_KEY: "",
      FORCE_COLOR: undefined,
      NO_COLOR: "1",
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

describe("offline CLI subprocess harness", () => {
  test("fixture-backed success writes only YAML to stdout and exits zero", async () => {
    const result = await spawnBun([
      "run",
      "tests/helpers/offline-cli-harness.ts",
      "games",
      "teams",
      "--id",
      "401752731",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.endsWith("\n")).toBe(true);
    expect(parse(result.stdout)).toMatchObject({
      command: "games teams",
      endpoint: "/games/teams",
      query: { id: 401752731 },
      count: 1,
    });
    expect(parse(result.stdout)).toHaveProperty("games");
  });
});

describe("real entrypoint process wiring without network", () => {
  test("--help reaches import.meta.main and exits cleanly without a key", async () => {
    const result = await spawnBun(["run", "src/index.ts", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: fbs");
    expect(result.stdout).toContain("games");
    expect(result.stdout).toContain("plays");
  });

  test("missing key reaches import.meta.main, writes YAML to stderr, and exits two", async () => {
    const result = await spawnBun([
      "run",
      "src/index.ts",
      "games",
      "--year",
      "2026",
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(parse(result.stderr)).toEqual({
      error: {
        code: "missing_api_key",
        message: "CFBD_API_KEY is required.",
        hint: "Set CFBD_API_KEY in your environment or .env file.",
      },
    });
  });
});

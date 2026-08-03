import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(workspace, "package.json"), "utf8"),
);
const candidates = [
  resolve(workspace, "dist", "fbs"),
  resolve(workspace, "dist", "fbs.exe"),
];
const executable = candidates.find((candidate) => existsSync(candidate));
assert.ok(executable, `Native executable not found at ${candidates.join(" or ")}`);

const executionRoot = mkdtempSync(join(tmpdir(), "fbs-native-smoke-"));
const resolvedExecutionRoot = resolve(executionRoot);
const resolvedSystemTemp = resolve(tmpdir());
assert.ok(
  resolvedExecutionRoot.startsWith(`${resolvedSystemTemp}${sep}`),
  "Refusing to use a temporary directory outside the system temp folder.",
);

function run(args) {
  const environment = { ...process.env };
  delete environment.CFBD_API_KEY;
  delete environment.CFBD_LIVE_TESTS;
  delete environment.NODE_OPTIONS;
  return spawnSync(executable, args, {
    cwd: executionRoot,
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
}

try {
  const version = run(["--version"]);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stderr, "");
  assert.equal(version.stdout.trim(), packageJson.version);

  const help = run(["games", "weather", "--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.equal(help.stderr, "");
  assert.match(help.stdout, /^Usage: fbs games weather/mu);

  const missingKey = run(["games", "--year", "2026"]);
  assert.equal(missingKey.status, 2, missingKey.stderr);
  assert.equal(missingKey.stdout, "");
  assert.match(missingKey.stderr, /^error:\n  code: missing_api_key$/mu);

  process.stdout.write(`Native smoke passed on ${process.platform}.\n`);
} finally {
  rmSync(executionRoot, { recursive: true, force: true });
}

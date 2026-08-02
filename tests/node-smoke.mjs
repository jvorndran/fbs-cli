import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(workspace, "dist", "fbs.js");
const packageJson = JSON.parse(
  readFileSync(join(workspace, "package.json"), "utf8"),
);

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? workspace,
    encoding: "utf8",
    env: options.env ?? process.env,
    windowsHide: true,
  });
}

const help = runCli(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.equal(help.stderr, "");
assert.match(help.stdout, /^Usage: fbs/m);

const version = runCli(["--version"]);
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stderr, "");
assert.equal(version.stdout.trim(), packageJson.version);

const temporaryRoot = mkdtempSync(join(tmpdir(), "fbs-cli-node-smoke-"));
const resolvedTemporaryRoot = resolve(temporaryRoot);
const resolvedSystemTemp = resolve(tmpdir());
assert.ok(
  resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`),
  "Refusing to use a temporary directory outside the system temp folder.",
);

try {
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.CFBD_API_KEY;
  delete cleanEnvironment.NODE_OPTIONS;

  const missingKey = runCli(["games", "--year", "2026"], {
    cwd: temporaryRoot,
    env: cleanEnvironment,
  });
  assert.equal(missingKey.status, 2, missingKey.stderr);
  assert.equal(missingKey.stdout, "");
  assert.deepEqual(parse(missingKey.stderr), {
    error: {
      code: "missing_api_key",
      message: "CFBD_API_KEY is required.",
      hint: "Set CFBD_API_KEY in your environment or .env file.",
    },
  });

  mkdirSync(join(temporaryRoot, ".env"));
  const invalidEnvironmentFile = runCli(["--help"], {
    cwd: temporaryRoot,
    env: cleanEnvironment,
  });
  assert.equal(invalidEnvironmentFile.status, 1, invalidEnvironmentFile.stderr);
  assert.equal(invalidEnvironmentFile.stdout, "");
  const environmentError = parse(invalidEnvironmentFile.stderr);
  assert.equal(environmentError.error.code, "unexpected_error");
  assert.equal(typeof environmentError.error.message, "string");
  assert.doesNotMatch(invalidEnvironmentFile.stderr, /\n\s+at\s/u);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

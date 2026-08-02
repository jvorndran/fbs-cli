import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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
    input: options.input,
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
      hint: "Set CFBD_API_KEY or run fbs auth to create .env in the current directory.",
    },
  });

  const sentinel = "node-smoke-auth-key";
  writeFileSync(
    join(temporaryRoot, ".env"),
    "OTHER_SETTING=keep\n",
    "utf8",
  );
  const auth = runCli(["auth"], {
    cwd: temporaryRoot,
    env: cleanEnvironment,
    input: `${sentinel}\n`,
  });
  assert.equal(auth.status, 0, auth.stderr);
  assert.equal(auth.stderr, "");
  assert.doesNotMatch(`${auth.stdout}${auth.stderr}`, new RegExp(sentinel, "u"));
  const authOutput = parse(auth.stdout);
  assert.equal(authOutput.command, "auth");
  assert.equal(authOutput.status, "saved");
  const expectedEnvironmentFile = join(temporaryRoot, ".env");
  assert.equal(authOutput.env_file, expectedEnvironmentFile);
  assert.equal(
    readFileSync(expectedEnvironmentFile, "utf8"),
    `OTHER_SETTING=keep\nCFBD_API_KEY=${sentinel}\n`,
  );

  const replacement = "node-smoke-replacement-key";
  const repeatedAuth = runCli(["auth"], {
    cwd: temporaryRoot,
    env: cleanEnvironment,
    input: `${replacement}\n`,
  });
  assert.equal(repeatedAuth.status, 0, repeatedAuth.stderr);
  assert.doesNotMatch(
    `${repeatedAuth.stdout}${repeatedAuth.stderr}`,
    new RegExp(replacement, "u"),
  );
  assert.equal(
    readFileSync(expectedEnvironmentFile, "utf8"),
    `OTHER_SETTING=keep\nCFBD_API_KEY=${replacement}\n`,
  );
  unlinkSync(join(temporaryRoot, ".env"));

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

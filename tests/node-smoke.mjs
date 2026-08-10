import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parse } from "yaml";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(workspace, "dist", "fbs.js");
const authFetchMockUrl = pathToFileURL(
  join(workspace, "tests", "node-auth-fetch-mock.mjs"),
).href;
const epipeFetchMockUrl = pathToFileURL(
  join(workspace, "tests", "node-epipe-fetch-mock.mjs"),
).href;
const packageJson = JSON.parse(
  readFileSync(join(workspace, "package.json"), "utf8"),
);

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [...(options.nodeArgs ?? []), cliPath, ...args], {
    cwd: options.cwd ?? workspace,
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    windowsHide: true,
  });
}

async function assertEarlyClosingConsumerExitsCleanly(cwd, environment) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      epipeFetchMockUrl,
      cliPath,
      "games",
      "--year",
      "2026",
    ],
    {
      cwd,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let sawOutput = false;
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdout.once("data", () => {
    sawOutput = true;
    child.stdout.destroy();
  });

  const { code, signal } = await new Promise((resolveClose, rejectClose) => {
    child.once("error", rejectClose);
    child.once("close", (exitCode, exitSignal) => {
      resolveClose({ code: exitCode, signal: exitSignal });
    });
  });

  assert.equal(sawOutput, true, "EPIPE smoke did not receive stdout");
  assert.equal(signal, null, `EPIPE smoke was terminated by ${signal}`);
  assert.equal(code, 0, stderr);
  assert.equal(stderr, "");
}

const help = runCli(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.equal(help.stderr, "");
assert.match(help.stdout, /^Usage: fbs/m);

const version = runCli(["--version"]);
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stderr, "");
assert.equal(version.stdout.trim(), packageJson.version);

const temporaryRoot = realpathSync(
  mkdtempSync(join(tmpdir(), "fbs-cli-node-smoke-")),
);
const resolvedTemporaryRoot = resolve(temporaryRoot);
const resolvedSystemTemp = realpathSync(tmpdir());
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
  const authRequestLog = join(temporaryRoot, "auth-requests.log");
  writeFileSync(
    join(temporaryRoot, ".env"),
    "OTHER_SETTING=keep\n",
    "utf8",
  );
  const authEnvironment = {
    ...cleanEnvironment,
    FBS_AUTH_TEST_EXPECTED_KEY: sentinel,
    FBS_AUTH_TEST_REQUEST_LOG: authRequestLog,
  };
  const auth = runCli(["auth"], {
    cwd: temporaryRoot,
    env: authEnvironment,
    input: `${sentinel}\n`,
    nodeArgs: ["--import", authFetchMockUrl],
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
  assert.equal(readFileSync(authRequestLog, "utf8"), "GET /info\n");

  const epipeKey = "node-smoke-epipe-key";
  await assertEarlyClosingConsumerExitsCleanly(temporaryRoot, {
    ...cleanEnvironment,
    CFBD_API_KEY: epipeKey,
    FBS_MAX_OUTPUT_CHARS: "0",
    FBS_EPIPE_TEST_EXPECTED_KEY: epipeKey,
  });

  const replacement = "node-smoke-replacement-key";
  const replacementEnvironment = {
    ...cleanEnvironment,
    FBS_AUTH_TEST_EXPECTED_KEY: replacement,
    FBS_AUTH_TEST_REQUEST_LOG: authRequestLog,
  };
  const repeatedAuth = runCli(["auth"], {
    cwd: temporaryRoot,
    env: replacementEnvironment,
    input: `${replacement}\n`,
    nodeArgs: ["--import", authFetchMockUrl],
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
  assert.equal(
    readFileSync(authRequestLog, "utf8"),
    "GET /info\nGET /info\n",
  );
  unlinkSync(join(temporaryRoot, ".env"));

  mkdirSync(join(temporaryRoot, ".env"));
  const invalidEnvironmentFile = runCli(["--help"], {
    cwd: temporaryRoot,
    env: cleanEnvironment,
  });
  assert.equal(invalidEnvironmentFile.status, 0, invalidEnvironmentFile.stderr);
  assert.equal(invalidEnvironmentFile.stderr, "");
  assert.match(invalidEnvironmentFile.stdout, /^Usage: fbs/u);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

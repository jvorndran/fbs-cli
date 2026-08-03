import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const input = resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "Usage: node scripts/installed-smoke.mjs <package.tgz|directory>");

const tarball = existsSync(input) && readdirSafe(input)
  ? findTarball(input)
  : input;
assert.ok(existsSync(tarball), `Package tarball does not exist: ${tarball}`);

function readdirSafe(path) {
  try {
    return readdirSync(path);
  } catch {
    return undefined;
  }
}

function findTarball(directory) {
  const tarballs = readdirSync(directory)
    .filter((name) => name.endsWith(".tgz"))
    .map((name) => join(directory, name));
  assert.equal(tarballs.length, 1, `${directory} must contain exactly one .tgz`);
  return tarballs[0];
}

const temporaryRoot = realpathSync(
  mkdtempSync(join(tmpdir(), "fbs-installed-smoke-")),
);
const resolvedTemporaryRoot = resolve(temporaryRoot);
const resolvedSystemTemp = realpathSync(tmpdir());
assert.ok(
  resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`),
  "Refusing to use a temporary directory outside the system temp folder.",
);

function runNpm(args) {
  return spawnSync("npm", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
  });
}

function runInstalled(args, cwd) {
  const bin = join(
    temporaryRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "fbs.cmd" : "fbs",
  );
  const environment = { ...process.env };
  delete environment.CFBD_API_KEY;
  delete environment.CFBD_LIVE_TESTS;
  delete environment.NODE_OPTIONS;
  return spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    env: environment,
    shell: process.platform === "win32",
    windowsHide: true,
  });
}

try {
  const installation = runNpm([
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--prefix",
      temporaryRoot,
      tarball,
    ]);
  assert.equal(installation.status, 0, `${installation.stdout}${installation.stderr}`);
  assert.doesNotMatch(
    `${installation.stdout}${installation.stderr}`,
    /(?:npm\s+warn\s+)?deprecated/iu,
    "Package installation emitted a deprecation warning",
  );

  const installedManifest = JSON.parse(
    readFileSync(
      join(temporaryRoot, "node_modules", "@jvorndran", "fbs-cli", "package.json"),
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(installedManifest.dependencies ?? {}).sort(), [
    "commander",
    "yaml",
    "zod",
  ]);
  assert.equal(installedManifest.dependencies?.cfbd, undefined);
  assert.equal(installedManifest.dependencies?.["@hey-api/client-fetch"], undefined);

  const dependencyTree = runNpm(["ls", "--all", "--json", "--prefix", temporaryRoot]);
  assert.equal(dependencyTree.status, 0, dependencyTree.stderr);
  assert.doesNotMatch(
    dependencyTree.stdout,
    /"(?:cfbd|@hey-api\/client-fetch)"\s*:/u,
    "Bundled client packages must not appear in the installed dependency tree",
  );

  const version = runInstalled(["--version"], temporaryRoot);
  assert.equal(version.status, 0, version.stderr);
  assert.match(version.stdout, /^\d+\.\d+\.\d+\s*$/u);
  assert.equal(version.stderr, "");

  for (const args of [["--help"], ["games", "--help"]]) {
    const help = runInstalled(args, temporaryRoot);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(help.stderr, "");
    assert.match(help.stdout, /^Usage: fbs/mu);
  }

  const missingKey = runInstalled(["games", "--year", "2026"], temporaryRoot);
  assert.equal(missingKey.status, 2, missingKey.stderr);
  assert.equal(missingKey.stdout, "");
  assert.match(missingKey.stderr, /^error:\n  code: missing_api_key$/mu);

  const authRoot = join(temporaryRoot, "auth-cwd");
  mkdirSync(authRoot);
  const authRequestLog = join(authRoot, "auth-requests.log");
  const sentinel = "packed-auth-smoke-key";
  const authEnvironment = {
    ...process.env,
    FBS_AUTH_TEST_EXPECTED_KEY: sentinel,
    FBS_AUTH_TEST_REQUEST_LOG: authRequestLog,
  };
  delete authEnvironment.CFBD_API_KEY;
  delete authEnvironment.CFBD_LIVE_TESTS;
  delete authEnvironment.NODE_OPTIONS;
  const installedCli = join(
    temporaryRoot,
    "node_modules",
    "@jvorndran",
    "fbs-cli",
    "dist",
    "fbs.js",
  );
  const auth = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(join(workspace, "tests", "node-auth-fetch-mock.mjs")).href,
      installedCli,
      "auth",
    ],
    {
      cwd: authRoot,
      encoding: "utf8",
      env: authEnvironment,
      input: `${sentinel}\n`,
      windowsHide: true,
    },
  );
  assert.equal(auth.status, 0, auth.stderr);
  assert.equal(auth.stderr, "");
  assert.doesNotMatch(`${auth.stdout}${auth.stderr}`, new RegExp(sentinel, "u"));
  assert.match(auth.stdout, /^command: auth$/mu);
  assert.match(auth.stdout, /^status: saved$/mu);
  assert.match(auth.stdout, /^active_source: env_file$/mu);
  assert.equal(
    readFileSync(join(authRoot, ".env"), "utf8"),
    `CFBD_API_KEY=${sentinel}\n`,
  );

  const savedCredentialEndpoint = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(join(workspace, "tests", "node-auth-fetch-mock.mjs")).href,
      installedCli,
      "info",
    ],
    {
      cwd: authRoot,
      encoding: "utf8",
      env: authEnvironment,
      windowsHide: true,
    },
  );
  assert.equal(savedCredentialEndpoint.status, 0, savedCredentialEndpoint.stderr);
  assert.equal(savedCredentialEndpoint.stderr, "");
  assert.match(savedCredentialEndpoint.stdout, /^command: info$/mu);
  assert.match(savedCredentialEndpoint.stdout, /^endpoint: \/info$/mu);
  assert.equal(readFileSync(authRequestLog, "utf8"), "GET /info\nGET /info\n");

  process.stdout.write(`Installed package smoke passed on ${process.platform} with ${process.version}.\n`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

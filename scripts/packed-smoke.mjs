import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tarball = resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "Usage: node scripts/packed-smoke.mjs <package.tgz>");
assert.ok(existsSync(tarball), `Package tarball does not exist: ${tarball}`);

const temporaryRoot = mkdtempSync(join(tmpdir(), "fbs-packed-smoke-"));
const resolvedTemporaryRoot = resolve(temporaryRoot);
const resolvedSystemTemp = resolve(tmpdir());
assert.ok(
  resolvedTemporaryRoot.startsWith(`${resolvedSystemTemp}${sep}`),
  "Refusing to use a temporary directory outside the system temp folder.",
);

function runCli(cliPath, args, cwd) {
  const environment = { ...process.env };
  delete environment.CFBD_API_KEY;
  delete environment.CFBD_LIVE_TESTS;
  delete environment.NODE_OPTIONS;

  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
}

try {
  const extractedRoot = join(temporaryRoot, "extracted");
  const executionRoot = join(temporaryRoot, "cwd");
  mkdirSync(extractedRoot);
  mkdirSync(executionRoot);

  const extraction = spawnSync("tar", ["-xf", tarball, "-C", extractedRoot], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(extraction.status, 0, extraction.stderr);

  const packageRoot = join(extractedRoot, "package");
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  assert.equal(manifest.bin?.fbs, "./dist/fbs.js");
  assert.equal(manifest.license, "MIT");
  assert.ok(existsSync(join(packageRoot, "LICENSE")));
  assert.ok(existsSync(join(packageRoot, "THIRD_PARTY_NOTICES.md")));
  assert.ok(existsSync(join(packageRoot, "skills", "fbs-cli", "SKILL.md")));

  const packageNodeModules = join(packageRoot, "node_modules");
  mkdirSync(packageNodeModules);
  for (const dependency of ["commander", "yaml", "zod"]) {
    cpSync(
      join(workspace, "node_modules", dependency),
      join(packageNodeModules, dependency),
      { recursive: true },
    );
  }

  const cliPath = join(packageRoot, "dist", "fbs.js");
  const version = runCli(cliPath, ["--version"], executionRoot);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stderr, "");
  assert.equal(version.stdout.trim(), manifest.version);

  for (const args of [["--help"], ["games", "weather", "--help"]]) {
    const help = runCli(cliPath, args, executionRoot);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(help.stderr, "");
    assert.match(help.stdout, /^Usage: fbs/mu);
  }

  const missingKey = runCli(cliPath, ["games", "--year", "2026"], executionRoot);
  assert.equal(missingKey.status, 2, missingKey.stderr);
  assert.equal(missingKey.stdout, "");
  assert.match(missingKey.stderr, /^error:\n  code: missing_api_key$/mu);

  process.stdout.write(`Packed artifact smoke passed for ${manifest.name}@${manifest.version}.\n`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(workspace, "package.json"), "utf8"),
);
const releaseTag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

assert.ok(releaseTag, "Supply a release tag or set GITHUB_REF_NAME.");
assert.match(
  packageJson.version,
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u,
  "package.json must contain a valid release version",
);
assert.equal(
  releaseTag,
  `v${packageJson.version}`,
  `Release tag ${releaseTag} does not match package version ${packageJson.version}`,
);

process.stdout.write(`Release tag ${releaseTag} matches package.json.\n`);

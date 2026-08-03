import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(workspace, "package.json"), "utf8"),
);
const configuredOutput = process.env.FBS_PACK_OUTPUT_DIR;
const temporaryOutput = configuredOutput
  ? undefined
  : mkdtempSync(resolve(tmpdir(), "fbs-pack-check-"));
const outputDirectory = configuredOutput
  ? resolve(workspace, configuredOutput)
  : temporaryOutput;

if (temporaryOutput) {
  const resolvedSystemTemp = resolve(tmpdir());
  assert.ok(
    resolve(temporaryOutput).startsWith(`${resolvedSystemTemp}${sep}`),
    "Refusing to use a temporary directory outside the system temp folder.",
  );
} else {
  mkdirSync(outputDirectory, { recursive: true });
}

function runNpm(args) {
  return spawnSync("npm", args, {
    cwd: workspace,
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
  });
}

try {
  const pack = runNpm([
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    outputDirectory,
  ]);
  assert.equal(pack.status, 0, pack.error?.message ?? pack.stderr);

  const packResult = JSON.parse(pack.stdout);
  assert.equal(packResult.length, 1, "npm pack must produce exactly one artifact");
  const metadata = packResult[0];
  assert.equal(metadata.name, packageJson.name);
  assert.equal(metadata.version, packageJson.version);
  assert.ok(metadata.size < 500_000, `Packed artifact is unexpectedly large: ${metadata.size}`);
  assert.ok(
    metadata.unpackedSize < 1_500_000,
    `Unpacked artifact is unexpectedly large: ${metadata.unpackedSize}`,
  );

  const expectedFiles = [
    "LICENSE",
    "README.md",
    "THIRD_PARTY_NOTICES.md",
    "dist/fbs.js",
    "package.json",
    "skills/fbs-cli/SKILL.md",
  ];
  assert.deepEqual(
    metadata.files.map((file) => file.path).sort(),
    expectedFiles,
    "Published file allowlist changed",
  );

  const distribution = readFileSync(resolve(workspace, "dist", "fbs.js"), "utf8");
  assert.match(distribution, /^#!\/usr\/bin\/env node\n/u, "Distribution needs a Node shebang");
  assert.doesNotMatch(
    distribution,
    /from ["'](?:cfbd|@hey-api\/client-fetch)["']/u,
    "cfbd and @hey-api/client-fetch must be bundled",
  );
  for (const dependency of ["commander", "yaml", "zod"]) {
    assert.match(
      distribution,
      new RegExp(`from ["']${dependency}["']`, "u"),
      `${dependency} must remain an external runtime dependency`,
    );
  }

  const tarball = resolve(outputDirectory, metadata.filename);
  assert.ok(existsSync(tarball), `npm pack did not create ${tarball}`);
  const smoke = spawnSync(
    process.execPath,
    [resolve(workspace, "scripts", "packed-smoke.mjs"), tarball],
    { cwd: workspace, encoding: "utf8", windowsHide: true },
  );
  assert.equal(smoke.status, 0, `${smoke.stdout}${smoke.stderr}`);
  process.stdout.write(smoke.stdout);

  process.stdout.write(
    `Package manifest verified (${metadata.size} bytes packed, ${metadata.unpackedSize} bytes unpacked).\n`,
  );
} finally {
  if (temporaryOutput) {
    rmSync(temporaryOutput, { recursive: true, force: true });
  }
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(workspace, "package.json"), "utf8"),
);
const readme = readFileSync(resolve(workspace, "README.md"), "utf8");
const skill = readFileSync(
  resolve(workspace, "skills", "fbs-cli", "SKILL.md"),
  "utf8",
);
const commandIndex = readFileSync(
  resolve(
    workspace,
    "skills",
    "fbs-cli",
    "references",
    "command-index.md",
  ),
  "utf8",
);
const landingPage = readFileSync(resolve(workspace, "index.html"), "utf8");
const socialPreview = readFileSync(
  resolve(workspace, "assets", "social-preview.png"),
);

const frontmatterMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/u);
assert.ok(frontmatterMatch, "Skill must begin with YAML frontmatter");
const frontmatter = parseYaml(frontmatterMatch[1]);
assert.deepEqual(
  Object.keys(frontmatter).sort(),
  ["description", "name"],
  "Skill frontmatter must contain only name and description",
);
assert.equal(frontmatter.name, "fbs-cli", "Skill frontmatter name changed");
assert.equal(
  typeof frontmatter.description,
  "string",
  "Skill frontmatter description must be a string",
);
assert.ok(
  frontmatter.description.trim().length > 0,
  "Skill frontmatter description must not be blank",
);

assert.equal(
  socialPreview.subarray(1, 4).toString("ascii"),
  "PNG",
  "Social preview must be a PNG",
);
assert.equal(socialPreview.readUInt32BE(16), 1280, "Social preview width changed");
assert.equal(socialPreview.readUInt32BE(20), 640, "Social preview height changed");
assert.match(
  landingPage,
  /<meta name="twitter:card" content="summary_large_image" \/>/u,
  "Landing page needs a large Twitter card",
);
const socialPreviewUrl =
  "https://jvorndran.github.io/fbs-cli/assets/social-preview.png";
assert.equal(
  landingPage.split(socialPreviewUrl).length - 1,
  2,
  "Landing page must use the social preview for Open Graph and Twitter",
);

function readmeCommandRows(document) {
  const pattern = /^\| `fbs ([^`]+)` \| `([^`]+)` -> `([^`]+)` \| (.*?) \| .*? \|$/gmu;
  return [...document.matchAll(pattern)].map((match) => ({
    command: match[1],
    endpoint: match[2],
    resultKey: match[3],
    flags: [...match[4].matchAll(/`(--[a-z0-9-]+)`/gu)].map(
      (flagMatch) => flagMatch[1],
    ),
  }));
}

function skillCommandRows(document) {
  const pattern = /^\| `fbs ([^`]+)` \| (.*?) \|$/gmu;
  return [...document.matchAll(pattern)].map((match) => ({
    command: match[1],
    flags: [...match[2].matchAll(/`(--[a-z0-9-]+)`/gu)].map(
      (flagMatch) => flagMatch[1],
    ),
  }));
}

const readmeRows = readmeCommandRows(readme);
const commandIndexRows = skillCommandRows(commandIndex);

assert.equal(readmeRows.length, 71, "README must document exactly 71 GET commands");
assert.equal(
  commandIndexRows.length,
  71,
  "Skill command index must document exactly 71 GET commands",
);
assert.equal(
  new Set(readmeRows.map((row) => row.command)).size,
  71,
  "README command paths must be unique",
);
assert.deepEqual(
  commandIndexRows.map(({ command, flags }) => ({ command, flags: [...flags].sort() })),
  readmeRows.map(({ command, flags }) => ({ command, flags: [...flags].sort() })),
  "README and skill command-index command/filter mappings must stay synchronized",
);

const skillLineCount = skill.trimEnd().split(/\r?\n/u).length;
assert.ok(
  skillLineCount <= 110,
  `SKILL.md must remain a concise entrypoint (found ${skillLineCount} lines)`,
);
assert.equal(
  skillCommandRows(skill).length,
  0,
  "The 71-command catalog belongs in references/command-index.md, not SKILL.md",
);
for (const reference of [
  "command-index.md",
]) {
  assert.match(
    skill,
    new RegExp(`\\(references/${reference.replace(".", "\\.")}\\)`, "u"),
    `SKILL.md must link to ${reference}`,
  );
}
const cfbdVersion = packageJson.devDependencies?.cfbd;
assert.equal(cfbdVersion, "5.21.0", "The generated-client audit is pinned to cfbd 5.21.0");

for (const [name, document] of [
  ["README", readme],
  ["skill", skill],
  ["landing page", landingPage],
]) {
  assert.match(document, /\b71\b/u, `${name} must state the audited route count`);
}
assert.match(readme, /cfbd` 5\.21\.0/u, "README must state the pinned client version");
assert.match(skill, /cfbd` 5\.21\.0/u, "Skill must state the pinned client version");

function bunExecutable() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && /(?:^|[\\/])bun(?:\.exe)?$/iu.test(npmExecPath)) {
    return npmExecPath;
  }
  return process.platform === "win32" ? "bun.exe" : "bun";
}

const cleanEnvironment = { ...process.env };
delete cleanEnvironment.CFBD_API_KEY;
delete cleanEnvironment.CFBD_LIVE_TESTS;

for (const row of readmeRows) {
  const result = spawnSync(
    bunExecutable(),
    ["run", "src/cli.ts", ...row.command.split(" "), "--help"],
    {
      cwd: workspace,
      encoding: "utf8",
      env: cleanEnvironment,
      windowsHide: true,
    },
  );

  assert.equal(result.status, 0, `${row.command} --help failed: ${result.stderr}`);
  assert.equal(result.stderr, "", `${row.command} --help wrote to stderr`);
  assert.match(result.stdout, /Examples?:/u, `${row.command} help needs an example`);

  const actualFlags = [
    ...new Set(
      [...result.stdout.matchAll(/(?:^|\s)(--[a-z0-9-]+)/gmu)]
        .map((match) => match[1])
        .filter((flag) => flag !== "--help"),
    ),
  ].sort();
  assert.deepEqual(
    [...row.flags].sort(),
    actualFlags,
    `${row.command} README flags differ from executable help`,
  );
}

process.stdout.write("Documentation contract verified for all 71 GET commands.\n");

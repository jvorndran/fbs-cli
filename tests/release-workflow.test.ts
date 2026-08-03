import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("the npm release publishes the tarball as a local filesystem path", () => {
  const workflow = readFileSync(
    resolve(workspace, ".github", "workflows", "publish.yml"),
    "utf8",
  );

  expect(workflow).toContain(
    "run: npm publish ./package-artifact/*.tgz --provenance --access public",
  );
});

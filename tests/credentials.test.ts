import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

import { resolveCredential } from "../src/config.ts";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "fbs-cli-credential-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory === undefined) continue;
    const resolvedDirectory = resolve(directory);
    const resolvedTemp = resolve(tmpdir());
    if (!resolvedDirectory.startsWith(`${resolvedTemp}${sep}`)) {
      throw new Error("Refusing to remove a credential test directory outside system temp.");
    }
    await rm(resolvedDirectory, { recursive: true, force: true });
  }
});

describe("credential resolution", () => {
  test("uses a valid environment value without inspecting .env", async () => {
    const root = await createTemporaryDirectory();
    const unsafeEnvironmentFile = join(root, ".env");
    await mkdir(unsafeEnvironmentFile);

    await expect(
      resolveCredential({
        environment: { CFBD_API_KEY: "environment-key" },
        environmentFile: unsafeEnvironmentFile,
      }),
    ).resolves.toEqual({
      apiKey: "environment-key",
      source: "environment",
    });
  });

  test("treats a blank environment value as absent and reads a BOM .env", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");
    await writeFile(
      environmentFile,
      "\uFEFFOTHER=value\r\nexport CFBD_API_KEY=file-key\r\n",
      "utf8",
    );

    await expect(
      resolveCredential({
        environment: { CFBD_API_KEY: "  " },
        environmentFile,
      }),
    ).resolves.toEqual({
      apiKey: "file-key",
      source: "env_file",
      environmentFile,
    });
  });

  test("does not fall back when a nonblank environment value is malformed", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");
    await writeFile(environmentFile, "CFBD_API_KEY=file-key\n", "utf8");

    await expect(
      resolveCredential({
        environment: { CFBD_API_KEY: "bad\nkey" },
        environmentFile,
      }),
    ).rejects.toMatchObject({
      code: "invalid_api_key",
      exitCode: 2,
    });
  });

  test("rejects non-regular .env paths", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");
    await mkdir(environmentFile);

    await expect(
      resolveCredential({ environment: {}, environmentFile }),
    ).rejects.toMatchObject({
      code: "unsafe_env_file",
      exitCode: 2,
    });
  });

  test("reports an unreadable regular .env without falling back", async () => {
    if (process.platform === "win32" || process.getuid?.() === 0) return;

    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");
    await writeFile(environmentFile, "CFBD_API_KEY=unreadable-key\n", "utf8");
    await chmod(environmentFile, 0o000);

    try {
      await expect(
        resolveCredential({ environment: {}, environmentFile }),
      ).rejects.toMatchObject({ code: "env_file_read_failed" });
    } finally {
      await chmod(environmentFile, 0o600);
    }
  });

  test("reports malformed UTF-8 as an invalid .env file", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");
    await writeFile(environmentFile, Uint8Array.from([0xff, 0xfe, 0xfd]));

    await expect(
      resolveCredential({ environment: {}, environmentFile }),
    ).rejects.toMatchObject({ code: "env_file_invalid", exitCode: 2 });
  });

  test("keeps the exact missing-key error for missing and blank file keys", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");

    await expect(
      resolveCredential({ environment: {}, environmentFile }),
    ).rejects.toMatchObject({ code: "missing_api_key", exitCode: 2 });

    await writeFile(environmentFile, "OTHER=value\nCFBD_API_KEY=   \n", "utf8");
    await expect(
      resolveCredential({ environment: {}, environmentFile }),
    ).rejects.toMatchObject({ code: "missing_api_key", exitCode: 2 });
  });
});

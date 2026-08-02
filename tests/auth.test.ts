import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { parse } from "yaml";

import {
  getEnvironmentFilePath,
  normalizeAuthApiKey,
  saveCredential,
  updateEnvironmentFile,
} from "../src/auth/env-file.ts";
import {
  readAuthApiKey,
  readPipedAuthApiKey,
  type AuthService,
} from "../src/auth/service.ts";
import { createProgram, runCli } from "../src/index.ts";
import { renderErrorYaml } from "../src/output/error.ts";
import { createMockApi } from "./helpers/mock-api.ts";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "fbs-cli-auth-test-"));
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
      throw new Error("Refusing to remove an auth test directory outside system temp.");
    }
    await rm(resolvedDirectory, { recursive: true, force: true });
  }
});

describe("auth .env storage", () => {
  test("targets .env in the current working directory", async () => {
    const root = await createTemporaryDirectory();
    expect(getEnvironmentFilePath(root)).toBe(resolve(root, ".env"));
  });

  test("creates, appends, and replaces CFBD_API_KEY while preserving other entries", () => {
    expect(updateEnvironmentFile("", "new-key")).toBe(
      "CFBD_API_KEY=new-key\n",
    );
    expect(updateEnvironmentFile("OTHER=value\r\n", "new-key")).toBe(
      "OTHER=value\r\nCFBD_API_KEY=new-key\r\n",
    );
    expect(updateEnvironmentFile("OTHER=value", "new-key")).toBe(
      "OTHER=value\nCFBD_API_KEY=new-key\n",
    );
    expect(
      updateEnvironmentFile(
        "FIRST=one\nexport CFBD_API_KEY=old\nSECOND=two\nCFBD_API_KEY=duplicate\n",
        "new-key",
      ),
    ).toBe("FIRST=one\nCFBD_API_KEY=new-key\nSECOND=two\n");
  });

  test("writes the current directory .env and updates it on later runs", async () => {
    const root = await createTemporaryDirectory();
    const environmentFile = join(root, ".env");

    await saveCredential("first-key", { environmentFile });
    expect(await readFile(environmentFile, "utf8")).toBe(
      "CFBD_API_KEY=first-key\n",
    );

    await writeFile(
      environmentFile,
      "OTHER=value\nCFBD_API_KEY=old-key\n",
      "utf8",
    );
    await saveCredential("second-key", { environmentFile });
    expect(await readFile(environmentFile, "utf8")).toBe(
      "OTHER=value\nCFBD_API_KEY=second-key\n",
    );
  });

  test("normalizes file failures without exposing the key", async () => {
    const root = await createTemporaryDirectory();
    const blockingFile = join(root, "not-a-directory");
    const sentinel = "never-render-this-write-key";
    await writeFile(blockingFile, "blocking file", "utf8");

    try {
      await saveCredential(sentinel, {
        environmentFile: join(blockingFile, ".env"),
      });
      throw new Error("Expected .env storage to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: "env_file_update_failed" });
      const rendered = renderErrorYaml(
        error as Parameters<typeof renderErrorYaml>[0],
      );
      expect(rendered).not.toContain(sentinel);
      expect(parse(rendered)).toMatchObject({
        error: {
          code: "env_file_update_failed",
          command: "auth",
        },
      });
    }
  });
});

describe("credential input", () => {
  test("normalizes one terminal newline and rejects unsafe input", async () => {
    expect(normalizeAuthApiKey("  abc-123._=  \n")).toBe("abc-123._=");
    expect(await readPipedAuthApiKey(Readable.from(["abc-123\n"]))).toBe(
      "abc-123",
    );

    expect(() => normalizeAuthApiKey("   ")).toThrow();
    expect(() => normalizeAuthApiKey("abc\nsecond\n")).toThrow();
    expect(() => normalizeAuthApiKey("abc key")).toThrow();
    expect(() => normalizeAuthApiKey(`abc${String.fromCharCode(0)}key`)).toThrow();
    await expect(readPipedAuthApiKey(Readable.from([]))).rejects.toMatchObject({
      code: "auth_input_required",
    });
    await expect(
      readPipedAuthApiKey(Readable.from(["x".repeat(4097)])),
    ).rejects.toMatchObject({ code: "auth_invalid_key" });
  });

  test("masks TTY input and restores raw mode after success and cancellation", async () => {
    class TtyInput extends PassThrough {
      readonly isTTY = true;
      isRaw = false;
      readonly rawModes: boolean[] = [];
      throwOnEnable = false;
      throwOnRestore = false;

      setRawMode(mode: boolean): this {
        this.rawModes.push(mode);
        if ((mode && this.throwOnEnable) || (!mode && this.throwOnRestore)) {
          throw new Error("simulated raw-mode failure");
        }
        this.isRaw = mode;
        return this;
      }
    }

    class TtyOutput extends PassThrough {
      readonly isTTY = true;
    }

    const successfulInput = new TtyInput();
    const successfulOutput = new TtyOutput();
    let renderedPrompt = "";
    successfulOutput.on("data", (chunk) => {
      renderedPrompt += chunk.toString();
    });
    const successfulRead = readAuthApiKey(
      successfulInput as unknown as NodeJS.ReadStream,
      successfulOutput as unknown as NodeJS.WriteStream,
    );
    for (const character of "secret-key") {
      successfulInput.emit("keypress", character, {
        ctrl: false,
        meta: false,
        name: character,
        sequence: character,
        shift: false,
      });
    }
    successfulInput.emit("keypress", "\r", {
      ctrl: false,
      meta: false,
      name: "return",
      sequence: "\r",
      shift: false,
    });

    expect(await successfulRead).toBe("secret-key");
    expect(successfulInput.rawModes).toEqual([true, false]);
    expect(renderedPrompt).toBe("CFBD API key: \n");
    expect(renderedPrompt).not.toContain("secret-key");

    const cancelledInput = new TtyInput();
    const cancelledRead = readAuthApiKey(
      cancelledInput as unknown as NodeJS.ReadStream,
      new TtyOutput() as unknown as NodeJS.WriteStream,
    );
    cancelledInput.emit("keypress", "\u0003", {
      ctrl: true,
      meta: false,
      name: "c",
      sequence: "\u0003",
      shift: false,
    });
    await expect(cancelledRead).rejects.toMatchObject({ code: "auth_cancelled" });
    expect(cancelledInput.rawModes).toEqual([true, false]);

    const restoreFailureInput = new TtyInput();
    restoreFailureInput.throwOnRestore = true;
    const restoreFailureRead = readAuthApiKey(
      restoreFailureInput as unknown as NodeJS.ReadStream,
      new TtyOutput() as unknown as NodeJS.WriteStream,
    );
    restoreFailureInput.emit("keypress", "k", {
      ctrl: false,
      meta: false,
      name: "k",
      sequence: "k",
      shift: false,
    });
    restoreFailureInput.emit("keypress", "\r", {
      ctrl: false,
      meta: false,
      name: "return",
      sequence: "\r",
      shift: false,
    });
    expect(await restoreFailureRead).toBe("k");
    expect(restoreFailureInput.rawModes).toEqual([true, false]);

    const setupFailureInput = new TtyInput();
    setupFailureInput.throwOnEnable = true;
    await expect(
      readAuthApiKey(
        setupFailureInput as unknown as NodeJS.ReadStream,
        new TtyOutput() as unknown as NodeJS.WriteStream,
      ),
    ).rejects.toMatchObject({ code: "auth_input_required" });
    expect(setupFailureInput.rawModes).toEqual([true, false]);
  });
});

describe("auth command", () => {
  test("stores through the injected service without calling CFBD", async () => {
    const mock = await createMockApi();
    const auth: AuthService = {
      saveCredential: async () => ({ environmentFile: "/project/.env" }),
    };
    let stdout = "";
    let stderr = "";

    const exitCode = await runCli(["auth"], {
      api: mock.api,
      auth,
      environment: {},
      io: {
        stdout: (value) => {
          stdout += value;
        },
        stderr: (value) => {
          stderr += value;
        },
      },
    });

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(mock.calls).toEqual([]);
    expect(parse(stdout)).toEqual({
      command: "auth",
      status: "saved",
      env_file: "/project/.env",
    });
  });

  test("advertises only the key-safe auth command surface", async () => {
    const auth: AuthService = {
      saveCredential: async () => ({ environmentFile: "unused" }),
    };
    const program = createProgram({ auth });
    const rootHelp = program.helpInformation();
    const authCommand = program.commands.find((command) => command.name() === "auth");
    let authHelp = "";
    const helpExitCode = await runCli(["auth", "--help"], {
      auth,
      environment: {},
      io: {
        stdout: (value) => {
          authHelp += value;
        },
      },
    });

    expect(rootHelp).toContain("auth");
    expect(authCommand).toBeDefined();
    expect(helpExitCode).toBe(0);
    expect(authHelp).toContain("current directory");
    expect(authHelp).toContain("fbs auth");
    expect(authHelp).not.toContain("--key");
    expect(authHelp).not.toContain("<api-key>");
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { parse } from "yaml";

import {
  getCredentialsFilePath,
  loadStoredCredential,
  normalizeAuthApiKey,
  saveCredential,
} from "../src/auth/credentials.ts";
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

describe("credential paths", () => {
  test("uses LocalAppData on Windows and ignores a relative override", () => {
    expect(
      getCredentialsFilePath({
        platform: "win32",
        environment: { LOCALAPPDATA: "C:\\Users\\Ada\\AppData\\Local" },
        homeDirectory: "C:\\Users\\Ada",
      }),
    ).toBe("C:\\Users\\Ada\\AppData\\Local\\fbs-cli\\credentials.env");

    expect(
      getCredentialsFilePath({
        platform: "win32",
        environment: { LOCALAPPDATA: "relative" },
        homeDirectory: "C:\\Users\\Ada",
      }),
    ).toBe("C:\\Users\\Ada\\AppData\\Local\\fbs-cli\\credentials.env");
  });

  test("uses native macOS and XDG Linux config locations", () => {
    expect(
      getCredentialsFilePath({
        platform: "darwin",
        environment: {},
        homeDirectory: "/Users/ada",
      }),
    ).toBe("/Users/ada/Library/Application Support/fbs-cli/credentials.env");

    expect(
      getCredentialsFilePath({
        platform: "linux",
        environment: { XDG_CONFIG_HOME: "/var/config/ada" },
        homeDirectory: "/home/ada",
      }),
    ).toBe("/var/config/ada/fbs-cli/credentials.env");

    expect(
      getCredentialsFilePath({
        platform: "linux",
        environment: { XDG_CONFIG_HOME: "relative" },
        homeDirectory: "/home/ada",
      }),
    ).toBe("/home/ada/.config/fbs-cli/credentials.env");
  });
});

describe("credential input and storage", () => {
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
    const cancelledOutput = new TtyOutput();
    const cancelledRead = readAuthApiKey(
      cancelledInput as unknown as NodeJS.ReadStream,
      cancelledOutput as unknown as NodeJS.WriteStream,
    );
    cancelledInput.emit("keypress", "\u0003", {
      ctrl: true,
      meta: false,
      name: "c",
      sequence: "\u0003",
      shift: false,
    });

    await expect(cancelledRead).rejects.toMatchObject({
      code: "auth_cancelled",
    });
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

  test("normalizes write failures without exposing the key", async () => {
    const root = await createTemporaryDirectory();
    const blockingFile = join(root, "not-a-directory");
    const sentinel = "never-render-this-write-key";
    await writeFile(blockingFile, "blocking file", "utf8");

    try {
      await saveCredential(sentinel, {
        credentialsFile: join(blockingFile, "credentials.env"),
      });
      throw new Error("Expected credential storage to fail.");
    } catch (error) {
      expect(error).toMatchObject({ code: "credential_write_failed" });
      const rendered = renderErrorYaml(error as Parameters<typeof renderErrorYaml>[0]);
      expect(rendered).not.toContain(sentinel);
      expect(parse(rendered)).toMatchObject({
        error: {
          code: "credential_write_failed",
          command: "auth",
        },
      });
    }
  });

  test("creates and atomically overwrites a credential without temp leftovers", async () => {
    const root = await createTemporaryDirectory();
    const credentialsFile = join(root, "config", "fbs-cli", "credentials.env");

    await saveCredential("first-key", { credentialsFile });
    await saveCredential("second-key", { credentialsFile });

    expect(await readFile(credentialsFile, "utf8")).toBe(
      "CFBD_API_KEY=second-key\n",
    );
    expect(await readdir(join(root, "config", "fbs-cli"))).toEqual([
      "credentials.env",
    ]);

    if (process.platform !== "win32") {
      expect((await stat(join(root, "config", "fbs-cli"))).mode & 0o777).toBe(
        0o700,
      );
      expect((await stat(credentialsFile)).mode & 0o777).toBe(0o600);
    }
  });

  test("loads the saved key only when the environment has no value", async () => {
    const root = await createTemporaryDirectory();
    const credentialsFile = join(root, "credentials.env");
    await writeFile(credentialsFile, "CFBD_API_KEY=saved-key\n", "utf8");

    const emptyEnvironment: NodeJS.ProcessEnv = {};
    expect(
      await loadStoredCredential({
        credentialsFile,
        environment: emptyEnvironment,
      }),
    ).toBe(true);
    expect(emptyEnvironment.CFBD_API_KEY).toBe("saved-key");

    for (const existingValue of ["environment-key", ""]) {
      const environment: NodeJS.ProcessEnv = {
        CFBD_API_KEY: existingValue,
      };
      expect(
        await loadStoredCredential({ credentialsFile, environment }),
      ).toBe(false);
      expect(environment.CFBD_API_KEY).toBe(existingValue);
    }

    const missingEnvironment: NodeJS.ProcessEnv = {};
    expect(
      await loadStoredCredential({
        credentialsFile: join(root, "missing.env"),
        environment: missingEnvironment,
      }),
    ).toBe(false);
    expect(missingEnvironment.CFBD_API_KEY).toBeUndefined();
  });

  test("normalizes corrupt and unreadable credential files to stable errors", async () => {
    const root = await createTemporaryDirectory();
    const credentialsFile = join(root, "credentials.env");
    await writeFile(credentialsFile, "not-a-credential\n", "utf8");

    await expect(
      loadStoredCredential({ credentialsFile, environment: {} }),
    ).rejects.toMatchObject({ code: "credential_read_failed" });

    if (process.platform !== "win32") {
      await chmod(credentialsFile, 0o000);
      await expect(
        loadStoredCredential({ credentialsFile, environment: {} }),
      ).rejects.toMatchObject({ code: "credential_read_failed" });
      await chmod(credentialsFile, 0o600);
    }
  });
});

describe("auth command", () => {
  test("stores through the injected service without calling CFBD or exposing a key", async () => {
    const sentinel = "never-print-this-auth-key";
    const mock = await createMockApi();
    const auth: AuthService = {
      saveCredential: async () => ({
        credentialsFile: "/user/config/fbs-cli/credentials.env",
      }),
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
    expect(`${stdout}${stderr}`).not.toContain(sentinel);
    expect(parse(stdout)).toEqual({
      command: "auth",
      status: "saved",
      credentials_file: "/user/config/fbs-cli/credentials.env",
    });
  });

  test("advertises only the key-safe auth command surface", async () => {
    const auth: AuthService = {
      saveCredential: async () => ({ credentialsFile: "unused" }),
    };
    const program = createProgram({ auth });
    const rootHelp = program.helpInformation();
    const authCommand = program.commands.find((command) => command.name() === "auth");

    expect(rootHelp).toContain("auth");
    expect(authCommand).toBeDefined();
    const authHelp = authCommand?.helpInformation() ?? "";
    expect(authHelp).toContain("fbs auth");
    expect(authHelp).not.toContain("--key");
    expect(authHelp).not.toContain("<api-key>");
  });
});

import { describe, expect, spyOn, test } from "bun:test";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";

import {
  createAuthService,
  readAuthApiKey,
  readPipedAuthApiKey,
} from "../src/auth/service.ts";
import {
  InvalidEnvironmentFileError,
  MissingApiKeyError,
  UnsafeEnvironmentFileError,
} from "../src/errors.ts";
import { runCli } from "../src/index.ts";
import { printErrorYaml } from "../src/output/error.ts";
import { printAgentYaml } from "../src/output/yaml.ts";
import { createCommandRuntime } from "../src/runtime.ts";
import { handleStdoutError } from "../src/utils/broken-pipe.ts";
import { loadFixture } from "./helpers/fixture.ts";
import { createMockApi } from "./helpers/mock-api.ts";

class TtyInput extends PassThrough {
  readonly isTTY = true;
  isRaw = false;

  setRawMode(mode: boolean): this {
    this.isRaw = mode;
    return this;
  }
}

class TtyOutput extends PassThrough {
  readonly isTTY = true;
}

function key(name: string) {
  return { ctrl: false, meta: false, name, sequence: name, shift: false };
}

describe("source coverage gates", () => {
  test.each([
    { argv: [] },
    { argv: ["game"] },
    { argv: ["game", "box"] },
    { argv: ["live"] },
    { argv: ["wepa"] },
    { argv: ["wepa", "team"] },
    { argv: ["wepa", "players"] },
  ])("group invocation $argv executes its help action", async ({ argv }) => {
    const mock = await createMockApi();
    let stdout = "";
    const exitCode = await runCli(argv, {
      api: mock.api,
      environment: {},
      io: { stdout: (value) => { stdout += value; } },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: fbs");
    expect(mock.calls).toEqual([]);
  });

  test("default output adapters write to their process streams", async () => {
    let stdout = "";
    let stderr = "";
    const stdoutWrite = spyOn(process.stdout, "write").mockImplementation(
      ((value: string | Uint8Array) => {
        stdout += value.toString();
        return true;
      }) as typeof process.stdout.write,
    );
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation(
      ((value: string | Uint8Array) => {
        stderr += value.toString();
        return true;
      }) as typeof process.stderr.write,
    );

    try {
      const mock = await createMockApi();
      const runtime = createCommandRuntime({ api: mock.api });
      runtime.io.stdout("runtime stdout\n");
      runtime.io.stderr("runtime stderr\n");
      printAgentYaml({
        command: "info",
        endpoint: "/info",
        query: {},
        count: 0,
        info: [],
      });
      printErrorYaml(new MissingApiKeyError());
    } finally {
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }

    expect(stdout).toContain("runtime stdout\n");
    expect(stdout).toContain("command: info\n");
    expect(stderr).toContain("runtime stderr\n");
    expect(stderr).toContain("code: missing_api_key\n");
  });

  test("runtime caches a lazily constructed private API", async () => {
    const runtime = createCommandRuntime({
      environment: { CFBD_API_KEY: "runtime-coverage-key" },
    });

    const first = await runtime.getApi();
    expect(runtime.getApi()).toBe(first);
  });

  test("the default auth validator reaches the guarded provider boundary before saving", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fbs-coverage-auth-"));
    const environmentFile = join(directory, ".env");
    try {
      const auth = createAuthService({
        environment: {},
        environmentFile,
        input: Readable.from(["offline-validator-key\n"]) as NodeJS.ReadStream,
      });

      await expect(auth.saveCredential()).rejects.toMatchObject({
        code: "network_error",
      });
      await expect(access(environmentFile)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("masked input handles terminal end, error, and oversized input", async () => {
    const ended = new TtyInput();
    const endedRead = readAuthApiKey(
      ended as unknown as NodeJS.ReadStream,
      new TtyOutput() as unknown as NodeJS.WriteStream,
    );
    ended.emit("end");
    await expect(endedRead).rejects.toMatchObject({ code: "auth_input_required" });

    const errored = new TtyInput();
    const erroredRead = readAuthApiKey(
      errored as unknown as NodeJS.ReadStream,
      new TtyOutput() as unknown as NodeJS.WriteStream,
    );
    errored.emit("error", new Error("simulated terminal failure"));
    await expect(erroredRead).rejects.toMatchObject({ code: "auth_input_required" });

    const oversized = new TtyInput();
    const oversizedRead = readAuthApiKey(
      oversized as unknown as NodeJS.ReadStream,
      new TtyOutput() as unknown as NodeJS.WriteStream,
    );
    oversized.emit("keypress", "x".repeat(4097), key("x"));
    await expect(oversizedRead).rejects.toMatchObject({ code: "auth_invalid_key" });
  });

  test("piped byte input and a TTY without raw mode follow explicit paths", async () => {
    async function* bytes() {
      yield new TextEncoder().encode("byte-key\n");
    }

    expect(await readPipedAuthApiKey(bytes())).toBe("byte-key");

    const input = new PassThrough();
    Object.defineProperty(input, "isTTY", { value: true });
    await expect(
      readAuthApiKey(
        input as unknown as NodeJS.ReadStream,
        new TtyOutput() as unknown as NodeJS.WriteStream,
      ),
    ).rejects.toMatchObject({ code: "auth_input_required" });
  });

  test("configuration error variants retain distinct machine codes", () => {
    expect(new InvalidEnvironmentFileError()).toMatchObject({
      code: "env_file_invalid",
    });
    expect(new UnsafeEnvironmentFileError()).toMatchObject({
      code: "unsafe_env_file",
    });
  });

  test("missing fixture data fails explicitly", async () => {
    await expect(
      loadFixture("definitely-not-a-real-fixture"),
    ).rejects.toThrow("Fixture not found: definitely-not-a-real-fixture");
  });

  test("the default broken-pipe exit adapter exits successfully", () => {
    const exit = spyOn(process, "exit").mockImplementation(
      (() => undefined as never) as typeof process.exit,
    );
    try {
      handleStdoutError(Object.assign(new Error("broken pipe"), { code: "EPIPE" }));
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      exit.mockRestore();
    }
  });
});

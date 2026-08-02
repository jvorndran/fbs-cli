#!/usr/bin/env node

import { runCli } from "./index";
import {
  getCredentialsFilePath,
  loadStoredCredential,
} from "./auth/credentials";
import { createAuthService } from "./auth/service";
import { asCliError } from "./errors";
import { renderErrorYaml } from "./output/error";

function isMissingEnvironmentFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function loadWorkingDirectoryEnvironment(): void {
  const loadEnvFile = Reflect.get(process, "loadEnvFile");
  if (typeof loadEnvFile === "function") {
    try {
      loadEnvFile.call(process);
    } catch (error) {
      if (!isMissingEnvironmentFile(error)) throw error;
    }
  }
}

function shouldLoadStoredCredential(argv: readonly string[]): boolean {
  if (argv.length === 0) return false;
  if (argv[0] === "auth") return false;
  return !argv.some((argument) =>
    ["--help", "-h", "--version", "-V"].includes(argument),
  );
}

async function main(): Promise<number> {
  try {
    const argv = process.argv.slice(2);
    const credentialsFile = getCredentialsFilePath();
    if (argv[0] !== "auth") {
      loadWorkingDirectoryEnvironment();
    }
    if (shouldLoadStoredCredential(argv)) {
      await loadStoredCredential({ credentialsFile });
    }

    return await runCli(argv, {
      auth: createAuthService({ credentialsFile }),
    });
  } catch (error) {
    const normalized = asCliError(error);
    process.stderr.write(renderErrorYaml(normalized));
    return normalized.exitCode;
  }
}

process.exitCode = await main();

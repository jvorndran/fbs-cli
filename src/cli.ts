#!/usr/bin/env node

import { runCli } from "./index";
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

async function main(): Promise<number> {
  try {
    const argv = process.argv.slice(2);
    if (argv[0] !== "auth") {
      loadWorkingDirectoryEnvironment();
    }
    return await runCli(argv);
  } catch (error) {
    const normalized = asCliError(error);
    process.stderr.write(renderErrorYaml(normalized));
    return normalized.exitCode;
  }
}

process.exitCode = await main();

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

async function main(): Promise<number> {
  try {
    const loadEnvFile = Reflect.get(process, "loadEnvFile");
    if (typeof loadEnvFile === "function") {
      loadEnvFile.call(process);
    }

    return await runCli();
  } catch (error) {
    if (isMissingEnvironmentFile(error)) {
      return await runCli();
    }

    const normalized = asCliError(error);
    process.stderr.write(renderErrorYaml(normalized));
    return normalized.exitCode;
  }
}

process.exitCode = await main();

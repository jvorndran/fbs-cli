#!/usr/bin/env node

import { runCli } from "./index";
import { asCliError } from "./errors";
import { renderErrorYaml } from "./output/error";
import { handleStdoutError } from "./utils/broken-pipe";

process.stdout.on("error", handleStdoutError);

async function main(): Promise<number> {
  try {
    const argv = process.argv.slice(2);
    return await runCli(argv);
  } catch (error) {
    const normalized = asCliError(error);
    process.stderr.write(renderErrorYaml(normalized));
    return normalized.exitCode;
  }
}

process.exitCode = await main();

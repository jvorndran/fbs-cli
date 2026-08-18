import { Command, CommanderError } from "commander";

import packageJson from "../package.json" with { type: "json" };

import type { AuthService } from "./auth/service";
import { createAuthService } from "./auth/service";
import { getEnvironmentFilePath } from "./auth/env-file";
import { registerAuthCommand } from "./commands/auth";
import { registerAnalyzeCommand } from "./commands/analyze";
import { registerCoachesCommand } from "./commands/coaches";
import { registerDraftCommand } from "./commands/draft";
import { registerDrivesCommand } from "./commands/drives";
import { registerGameCommand } from "./commands/game";
import { registerGamesCommand } from "./commands/games";
import { registerInfoCommand } from "./commands/info";
import { registerLiveCommand } from "./commands/live";
import { registerLinesCommand } from "./commands/lines";
import { registerMetricsCommand } from "./commands/metrics";
import { registerPlayerCommand } from "./commands/player";
import { registerPlayoffsCommand } from "./commands/playoffs";
import { registerPlaysCommand } from "./commands/plays";
import { registerPpaCommand } from "./commands/ppa";
import { registerRankingsCommand } from "./commands/rankings";
import { registerRatingsCommand } from "./commands/ratings";
import { registerRecruitingCommand } from "./commands/recruiting";
import { registerReferenceCommands } from "./commands/reference";
import { registerRosterCommand } from "./commands/roster";
import { registerStatsCommand } from "./commands/stats";
import { registerTeamsCommand } from "./commands/teams";
import { registerWepaCommand } from "./commands/wepa";
import { asCliError, CliError } from "./errors";
import { renderErrorYaml } from "./output/error";
import type { CommandRuntime, RuntimeOptions } from "./runtime";
import { createCommandRuntime } from "./runtime";

function buildProgram(runtime: CommandRuntime, auth: AuthService): Command {
  const program = new Command()
    .name("fbs")
    .description("Explore CollegeFootballData with clean YAML output")
    .version(packageJson.version)
    .helpOption("-h, --help", "Display help for a command")
    .showHelpAfterError(false)
    .showSuggestionAfterError(false)
    .exitOverride()
    .enablePositionalOptions()
    .configureOutput({
      writeOut: runtime.io.stdout,
      writeErr: runtime.io.stderr,
      outputError: () => undefined,
    });

  registerAuthCommand(program, runtime, auth);
  registerAnalyzeCommand(program, runtime);
  registerTeamsCommand(program, runtime);
  registerGamesCommand(program, runtime);
  registerRosterCommand(program, runtime);
  registerInfoCommand(program, runtime);
  registerDrivesCommand(program, runtime);
  registerPlaysCommand(program, runtime);
  registerStatsCommand(program, runtime);
  registerPlayerCommand(program, runtime);
  registerReferenceCommands(program, runtime);
  registerPpaCommand(program, runtime);
  registerMetricsCommand(program, runtime);
  registerWepaCommand(program, runtime);
  registerRecruitingCommand(program, runtime);
  registerRatingsCommand(program, runtime);
  registerRankingsCommand(program, runtime);
  registerPlayoffsCommand(program, runtime);
  registerLiveCommand(program, runtime);
  registerLinesCommand(program, runtime);
  registerDraftCommand(program, runtime);
  registerCoachesCommand(program, runtime);
  registerGameCommand(program, runtime);

  program
    .addHelpText(
      "after",
      "\nExamples:\n  fbs auth\n  fbs analyze team --year 2026 --team \"Florida State\"\n  fbs games --year 2026 --team \"Florida State\"\n  fbs plays --year 2026 --week 1 --offense \"Florida State\"\n  fbs info usage --api cfb --days 7\n",
    )
    .action(() => {
      program.outputHelp();
    })
    .allowExcessArguments(false);

  return program;
}

function resolveAuthService(options: RuntimeOptions): AuthService {
  if (options.auth !== undefined) return options.auth;

  const environmentFile =
    options.environmentFile ??
    (options.workingDirectory === undefined
      ? undefined
      : getEnvironmentFilePath(options.workingDirectory));
  return createAuthService({
    environment: options.environment ?? process.env,
    ...(environmentFile === undefined ? {} : { environmentFile }),
  });
}

export function createProgram(options: RuntimeOptions = {}): Command {
  return buildProgram(
    createCommandRuntime(options),
    resolveAuthService(options),
  );
}

function commanderError(error: CommanderError): CliError {
  return new CliError({
    code: "cli_parse_error",
    message: error.message.replace(/^error:\s*/i, ""),
    hint: "Run fbs --help or fbs <command> --help to inspect valid arguments.",
    exitCode: error.exitCode === 0 ? 0 : 2,
  });
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  options: RuntimeOptions = {},
): Promise<number> {
  const runtime = createCommandRuntime(options);
  const program = buildProgram(runtime, resolveAuthService(options));

  try {
    await program.parseAsync([...argv], { from: "user" });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return 0;
      runtime.io.stderr(renderErrorYaml(commanderError(error)));
      return 2;
    }

    const normalized = asCliError(error);
    runtime.io.stderr(renderErrorYaml(normalized));
    return normalized.exitCode;
  }
}

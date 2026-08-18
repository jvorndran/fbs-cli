import { Option, type Command } from "commander";
import { z } from "zod";

import type { CommandRuntime } from "../runtime";
import { fromZodError, InvalidAnalysisCutoffError } from "../errors";
import { runTeamAnalysis } from "../analysis/service";
import type { TeamAnalysisOptions } from "../analysis/types";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidRfc3339(value: string): boolean {
  const match = RFC3339.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[10] === undefined ? 0 : Number(match[10]);
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11]);
  return (
    month >= 1 && month <= 12 &&
    day >= 1 && day <= daysInMonth(year, month) &&
    hour <= 23 && minute <= 59 && second <= 59 &&
    offsetHour <= 23 && offsetMinute <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}

const analysisOptionsSchema = z.object({
  year: z.number().int().min(1869),
  team: z.string().trim().min(1, "team is required"),
  asOf: z.string().optional(),
  beforeGameId: z.number().int().nonnegative().optional(),
  seasonType: z.enum([
    "regular",
    "postseason",
    "both",
    "allstar",
    "spring_regular",
    "spring_postseason",
  ]).default("both"),
  classification: z.enum(["fbs", "fcs", "ii", "iii"]).default("fbs"),
});

type RawAnalysisOptions = Partial<TeamAnalysisOptions> & {
  year: number;
  team: string;
};

function validateOptions(options: RawAnalysisOptions): TeamAnalysisOptions {
  const parsed = analysisOptionsSchema.safeParse(options);
  if (!parsed.success) throw fromZodError(parsed.error);
  const { asOf, beforeGameId, ...required } = parsed.data;
  if (asOf !== undefined && beforeGameId !== undefined) {
    throw new InvalidAnalysisCutoffError(
      "--as-of and --before-game-id cannot be used together.",
      "Supply exactly one cutoff option.",
    );
  }
  if (
    asOf !== undefined &&
    !isValidRfc3339(asOf)
  ) {
    throw new InvalidAnalysisCutoffError(
      "--as-of must be a valid RFC3339 timestamp.",
      "Use a timestamp such as 2026-10-01T00:00:00Z.",
    );
  }
  return {
    ...required,
    ...(asOf === undefined ? {} : { asOf }),
    ...(beforeGameId === undefined ? {} : { beforeGameId }),
  };
}

export function registerAnalyzeCommand(program: Command, runtime: CommandRuntime): void {
  const analyze = program.command("analyze").description("Fresh derived analysis reports");
  analyze.action((_options: unknown, command: Command) => command.outputHelp());

  analyze
    .command("team")
    .description("Build a fresh cutoff-safe compact team analytics report")
    .requiredOption("--year <number>", "Season year (required)", parseInteger)
    .requiredOption("--team <name>", "CFBD team name (required)")
    .option("--as-of <RFC3339>", "Exclude games kicking off at or after this timestamp")
    .option(
      "--before-game-id <id>",
      "Use a target game's kickoff as the cutoff and exclude that game",
      parseInteger,
    )
    .addOption(
      new Option("--season-type <value>", "Season type; defaults to both").choices([
        "regular",
        "postseason",
        "both",
        "allstar",
        "spring_regular",
        "spring_postseason",
      ]),
    )
    .addOption(
      new Option(
        "--classification <value>",
        "Peer division classification; defaults to fbs",
      ).choices(["fbs", "fcs", "ii", "iii"]),
    )
    .addHelpText(
      "after",
      "\nThe report fetches /games first. If completed games qualify, it then makes fresh /plays/types, weekly /plays, /drives, /games/players, /stats/game/advanced, and /stats/game/havoc requests. Weekly play requests run with concurrency 3.\n\nExamples:\n  fbs analyze team --year 2026 --team \"Florida State\"\n  fbs analyze team --year 2026 --team \"Florida State\" --before-game-id 401752731\n  fbs analyze team --year 2026 --team \"Florida State\" --as-of 2026-10-01T00:00:00Z\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const invocationStart = new Date();
      const raw = suppliedOptions<RawAnalysisOptions>(command);
      const rawQuery = asQueryRecord({
        year: raw.year,
        team: raw.team,
        ...(raw.asOf === undefined ? {} : { asOf: raw.asOf }),
        ...(raw.beforeGameId === undefined ? {} : { beforeGameId: raw.beforeGameId }),
        ...(raw.seasonType === undefined ? {} : { seasonType: raw.seasonType }),
        ...(raw.classification === undefined ? {} : { classification: raw.classification }),
      });
      await withCommandContext("analyze team", rawQuery, async () => {
        const options = validateOptions({
          ...raw,
          seasonType: raw.seasonType ?? "both",
          classification: raw.classification ?? "fbs",
        });
        const publicQuery = asQueryRecord({
          year: options.year,
          team: options.team,
          ...(options.asOf === undefined ? {} : { asOf: options.asOf }),
          ...(options.beforeGameId === undefined
            ? {}
            : { beforeGameId: options.beforeGameId }),
          ...(raw.seasonType === undefined ? {} : { seasonType: options.seasonType }),
          ...(raw.classification === undefined
            ? {}
            : { classification: options.classification }),
        });
        await runTeamAnalysis(runtime, options, publicQuery, invocationStart);
      });
    })
    .allowExcessArguments(false);
}

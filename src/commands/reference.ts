import type { Command } from "commander";

import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildCalendarQuery,
  buildNoQuery,
  buildRecordsQuery,
  buildScoreboardQuery,
  buildTalentQuery,
  type CalendarQuery,
  type RecordsQuery,
  type ScoreboardQuery,
  type TalentQuery,
  validateCalendarQuery,
  validateNoQuery,
  validateRecordsQuery,
  validateScoreboardQuery,
  validateTalentQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformCalendar,
  transformConferences,
  transformRecords,
  transformScoreboard,
  transformTalent,
  transformVenues,
} from "../transformers/reference-endpoints.ts";
import { addClassificationOption, parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerConferencesCommand(program: Command, runtime: CommandRuntime): void {
  const conferences = program
    .command("conferences")
    .description("List college football conferences")
    .addHelpText("after", "\nExample:\n  fbs conferences\n")
    .action(async () => {
      const rawQuery = buildNoQuery();

      await withCommandContext("conferences", rawQuery, async () => {
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "conferences",
          endpoint: "/conferences",
          query: asQueryRecord(query),
          resultKey: "conferences",
          request: (api) => asReferenceCfbdApi(api).conferences(),
          transform: transformConferences,
        });
      });
    });

  conferences.allowExcessArguments(false);
}

function registerTalentCommand(program: Command, runtime: CommandRuntime): void {
  const talent = program
    .command("talent")
    .description("Retrieve team talent composite ratings")
    .option("--year <number>", "Season year (required)", parseInteger)
    .addHelpText("after", "\nExample:\n  fbs talent --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<TalentQuery>>(command);
      const rawQuery = buildTalentQuery(options);

      await withCommandContext("talent", rawQuery, async () => {
        const query = validateTalentQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "talent",
          endpoint: "/talent",
          query: asQueryRecord(query),
          resultKey: "talent",
          request: (api) => asReferenceCfbdApi(api).talent(query),
          transform: transformTalent,
        });
      });
    });

  talent.allowExcessArguments(false);
}

function registerVenuesCommand(program: Command, runtime: CommandRuntime): void {
  const venues = program
    .command("venues")
    .description("List college football venues")
    .addHelpText("after", "\nExample:\n  fbs venues\n")
    .action(async () => {
      const rawQuery = buildNoQuery();

      await withCommandContext("venues", rawQuery, async () => {
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "venues",
          endpoint: "/venues",
          query: asQueryRecord(query),
          resultKey: "venues",
          request: (api) => asReferenceCfbdApi(api).venues(),
          transform: transformVenues,
        });
      });
    });

  venues.allowExcessArguments(false);
}

function registerRecordsCommand(program: Command, runtime: CommandRuntime): void {
  const records = program
    .command("records")
    .description("Retrieve team season records")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .addHelpText(
      "after",
      "\nSupply --year or --team.\n\nExamples:\n  fbs records --year 2026\n  fbs records --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RecordsQuery>>(command);
      const rawQuery = buildRecordsQuery(options);

      await withCommandContext("records", rawQuery, async () => {
        const query = validateRecordsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "records",
          endpoint: "/records",
          query: asQueryRecord(query),
          resultKey: "records",
          request: (api) => asReferenceCfbdApi(api).records(query),
          transform: transformRecords,
        });
      });
    });

  records.allowExcessArguments(false);
}

function registerCalendarCommand(program: Command, runtime: CommandRuntime): void {
  const calendar = program
    .command("calendar")
    .description("Retrieve the season week calendar")
    .option("--year <number>", "Season year (required)", parseInteger)
    .addHelpText("after", "\nExample:\n  fbs calendar --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CalendarQuery>>(command);
      const rawQuery = buildCalendarQuery(options);

      await withCommandContext("calendar", rawQuery, async () => {
        const query = validateCalendarQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "calendar",
          endpoint: "/calendar",
          query: asQueryRecord(query),
          resultKey: "calendar",
          request: (api) => asReferenceCfbdApi(api).calendar(query),
          transform: transformCalendar,
        });
      });
    });

  calendar.allowExcessArguments(false);
}

function registerScoreboardCommand(program: Command, runtime: CommandRuntime): void {
  const scoreboard = program
    .command("scoreboard")
    .description("Retrieve the current college football scoreboard")
    .option("--conference <value>", "Conference abbreviation");

  addClassificationOption(scoreboard);
  scoreboard
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExamples:\n  fbs scoreboard\n  fbs scoreboard --classification fbs --conference ACC\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<ScoreboardQuery>>(command);
      const rawQuery = buildScoreboardQuery(options);

      await withCommandContext("scoreboard", rawQuery, async () => {
        const query = validateScoreboardQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "scoreboard",
          endpoint: "/scoreboard",
          query: asQueryRecord(query),
          resultKey: "scoreboard",
          request: (api) => asReferenceCfbdApi(api).scoreboard(query),
          transform: transformScoreboard,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerReferenceCommands(
  program: Command,
  runtime: CommandRuntime,
): void {
  registerConferencesCommand(program, runtime);
  registerTalentCommand(program, runtime);
  registerVenuesCommand(program, runtime);
  registerRecordsCommand(program, runtime);
  registerCalendarCommand(program, runtime);
  registerScoreboardCommand(program, runtime);
}

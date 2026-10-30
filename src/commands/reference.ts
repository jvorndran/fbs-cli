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
import {
  booleanMatches,
  filterRows,
  localFilters,
  numberMatches,
  parseBoolean,
  parseNonNegativeInteger,
  parseNumber,
  stringMatches,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
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
    .option("--team <name>", "Local filter: exact team name (case-insensitive)")
    .option("--min-talent <number>", "Local filter: minimum talent score (inclusive)", parseNumber)
    .option("--max-talent <number>", "Local filter: maximum talent score (inclusive)", parseNumber)
    .addHelpText("after", "\nExample:\n  fbs talent --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const { team, minTalent, maxTalent, ...options } = suppliedOptions<
        Partial<TalentQuery> & { team?: string; minTalent?: number; maxTalent?: number }
      >(command);
      const filters = localFilters({ team, minTalent, maxTalent });
      const rawQuery = buildTalentQuery(options);

      await withCommandContext("talent", rawQuery, async () => {
        validateOrderedRange(minTalent, maxTalent, "min-talent", "max-talent");
        const query = validateTalentQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "talent",
          endpoint: "/talent",
          query: asQueryRecord(query),
          resultKey: "talent",
          request: (api) => asReferenceCfbdApi(api).talent(query),
          transform: transformTalent,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(valueAt(row, "team"), filters?.team as string | undefined) &&
                numberMatches(valueAt(row, "talent"), minTalent, maxTalent),
            ),
        });
      });
    });

  talent.allowExcessArguments(false);
}

function registerVenuesCommand(program: Command, runtime: CommandRuntime): void {
  const venues = program
    .command("venues")
    .description("List college football venues")
    .option("--name <text>", "Local filter: case-insensitive venue name substring")
    .option("--city <value>", "Local filter: city")
    .option("--state <value>", "Local filter: state")
    .option("--dome <boolean>", "Local filter: dome", parseBoolean)
    .option("--grass <boolean>", "Local filter: grass", parseBoolean)
    .option("--min-capacity <number>", "Local filter: minimum seating capacity (inclusive)", parseNonNegativeInteger)
    .option("--max-capacity <number>", "Local filter: maximum seating capacity (inclusive)", parseNonNegativeInteger)
    .addHelpText("after", "\nExample:\n  fbs venues\n")
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<{
        name?: string;
        city?: string;
        state?: string;
        dome?: boolean;
        grass?: boolean;
        minCapacity?: number;
        maxCapacity?: number;
      }>(command);
      const filters = localFilters(options);
      const nameSearch = (filters?.name as string | undefined)?.toLowerCase();
      const rawQuery = buildNoQuery();

      await withCommandContext("venues", rawQuery, async () => {
        validateOrderedRange(options.minCapacity, options.maxCapacity, "min-capacity", "max-capacity");
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "venues",
          endpoint: "/venues",
          query: asQueryRecord(query),
          resultKey: "venues",
          request: (api) => asReferenceCfbdApi(api).venues(),
          transform: transformVenues,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                (nameSearch === undefined ||
                  (typeof row.name === "string" && row.name.toLowerCase().includes(nameSearch))) &&
                stringMatches(valueAt(row, "city"), filters?.city as string | undefined) &&
                stringMatches(valueAt(row, "state"), filters?.state as string | undefined) &&
                booleanMatches(valueAt(row, "dome"), filters?.dome as boolean | undefined) &&
                booleanMatches(valueAt(row, "grass"), filters?.grass as boolean | undefined) &&
                numberMatches(valueAt(row, "capacity"), options.minCapacity, options.maxCapacity),
            ),
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
    .option("--min-wins <number>", "Local filter: minimum total-record wins (inclusive)", parseNonNegativeInteger)
    .option("--max-wins <number>", "Local filter: maximum total-record wins (inclusive)", parseNonNegativeInteger)
    .option("--min-losses <number>", "Local filter: minimum total-record losses (inclusive)", parseNonNegativeInteger)
    .option("--max-losses <number>", "Local filter: maximum total-record losses (inclusive)", parseNonNegativeInteger)
    .addHelpText(
      "after",
      "\nSupply --year or --team.\n\nExamples:\n  fbs records --year 2026\n  fbs records --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minWins, maxWins, minLosses, maxLosses, ...options } = suppliedOptions<
        Partial<RecordsQuery> & {
          minWins?: number; maxWins?: number; minLosses?: number; maxLosses?: number;
        }
      >(command);
      const filters = localFilters({ minWins, maxWins, minLosses, maxLosses });
      const rawQuery = buildRecordsQuery(options);

      await withCommandContext("records", rawQuery, async () => {
        validateOrderedRange(minWins, maxWins, "min-wins", "max-wins");
        validateOrderedRange(minLosses, maxLosses, "min-losses", "max-losses");
        const query = validateRecordsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "records",
          endpoint: "/records",
          query: asQueryRecord(query),
          resultKey: "records",
          request: (api) => asReferenceCfbdApi(api).records(query),
          transform: transformRecords,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) =>
            numberMatches(valueAt(row, "total.wins"), minWins, maxWins) &&
            numberMatches(valueAt(row, "total.losses"), minLosses, maxLosses)),
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
    .option("--min-week <number>", "Local filter: minimum week (inclusive)", parseNonNegativeInteger)
    .option("--max-week <number>", "Local filter: maximum week (inclusive)", parseNonNegativeInteger)
    .addHelpText("after", "\nExample:\n  fbs calendar --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const { minWeek, maxWeek, ...options } = suppliedOptions<
        Partial<CalendarQuery> & { minWeek?: number; maxWeek?: number }
      >(command);
      const filters = localFilters({ minWeek, maxWeek });
      const rawQuery = buildCalendarQuery(options);

      await withCommandContext("calendar", rawQuery, async () => {
        validateOrderedRange(minWeek, maxWeek, "min-week", "max-week");
        const query = validateCalendarQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "calendar",
          endpoint: "/calendar",
          query: asQueryRecord(query),
          resultKey: "calendar",
          request: (api) => asReferenceCfbdApi(api).calendar(query),
          transform: transformCalendar,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(rows, (row) => numberMatches(valueAt(row, "week"), minWeek, maxWeek)),
        });
      });
    });

  calendar.allowExcessArguments(false);
}

function registerScoreboardCommand(program: Command, runtime: CommandRuntime): void {
  const scoreboard = program
    .command("scoreboard")
    .description("Retrieve the current college football scoreboard")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Local filter: participating team")
    .option("--status <value>", "Local filter: game status")
    .option("--venue <value>", "Local filter: venue name");

  addClassificationOption(scoreboard);
  scoreboard
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExamples:\n  fbs scoreboard\n  fbs scoreboard --classification fbs --conference ACC\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { team, status, venue, ...options } = suppliedOptions<
        Partial<ScoreboardQuery> & { team?: string; status?: string; venue?: string }
      >(command);
      const filters = localFilters({ team, status, venue });
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
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                (filters?.team === undefined ||
                  stringMatches(valueAt(row, "home.team"), filters.team as string) ||
                  stringMatches(valueAt(row, "away.team"), filters.team as string)) &&
                stringMatches(valueAt(row, "status"), filters?.status as string | undefined) &&
                stringMatches(valueAt(row, "venue.name", "venue"), filters?.venue as string | undefined),
            ),
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

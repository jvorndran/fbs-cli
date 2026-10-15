import type { Command } from "commander";

import {
  buildRosterQuery,
  type RosterQuery,
  validateRosterQuery,
} from "../cfbd/query-builders";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformRoster } from "../transformers/roster.ts";
import { addClassificationOption, parseInteger, suppliedOptions } from "./options";
import {
  filterRows,
  localFilters,
  numberMatches,
  parseNonNegativeInteger,
  stringMatches,
  valueAt,
  validateOrderedRange,
} from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerRosterCommand(program: Command, runtime: CommandRuntime): void {
  const roster = program
    .command("roster")
    .description("Retrieve historical team rosters")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--position <value>", "Local filter: position")
    .option("--state <value>", "Local filter: hometown state")
    .option("--country <value>", "Local filter: hometown country")
    .option("--jersey <number>", "Local filter: jersey number", parseNonNegativeInteger)
    .option("--class-year <number>", "Local filter: class year", parseNonNegativeInteger)
    .option("--min-height <number>", "Local filter: minimum height in inches (inclusive)", parseNonNegativeInteger)
    .option("--max-height <number>", "Local filter: maximum height in inches (inclusive)", parseNonNegativeInteger)
    .option("--min-weight <number>", "Local filter: minimum weight in pounds (inclusive)", parseNonNegativeInteger)
    .option("--max-weight <number>", "Local filter: maximum weight in pounds (inclusive)", parseNonNegativeInteger);

  addClassificationOption(roster);
  roster
    .addHelpText(
      "after",
      "\nExamples:\n  fbs roster --year 2026 --team \"Florida State\"\n  fbs roster --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { position, state, country, jersey, classYear, minHeight, maxHeight, minWeight, maxWeight, ...options } = suppliedOptions<
        Partial<RosterQuery> & {
          position?: string;
          state?: string;
          country?: string;
          jersey?: number;
          classYear?: number;
          minHeight?: number;
          maxHeight?: number;
          minWeight?: number;
          maxWeight?: number;
        }
      >(command);
      const filters = localFilters({ position, state, country, jersey, classYear, minHeight, maxHeight, minWeight, maxWeight });
      const rawQuery = buildRosterQuery(options);

      await withCommandContext("roster", rawQuery, async () => {
        validateOrderedRange(minHeight, maxHeight, "min-height", "max-height");
        validateOrderedRange(minWeight, maxWeight, "min-weight", "max-weight");
        const query = validateRosterQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "roster",
          endpoint: "/roster",
          query: asQueryRecord(query),
          resultKey: "players",
          request: (api) => api.roster(query),
          transform: transformRoster,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(valueAt(row, "position"), filters?.position as string | undefined) &&
                stringMatches(valueAt(row, "hometown.state", "state"), filters?.state as string | undefined) &&
                stringMatches(valueAt(row, "hometown.country", "country"), filters?.country as string | undefined) &&
                (filters?.jersey === undefined || valueAt(row, "jersey") === filters.jersey) &&
                (filters?.classYear === undefined ||
                  valueAt(row, "class_year", "year") === filters.classYear) &&
                numberMatches(valueAt(row, "height_inches"), minHeight, maxHeight) &&
                numberMatches(valueAt(row, "weight_lbs"), minWeight, maxWeight),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

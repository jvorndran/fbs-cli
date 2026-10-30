import type { Command } from "commander";

import {
  buildFbsTeamsQuery,
  type FbsTeamsQuery,
  validateFbsTeamsQuery,
} from "../cfbd/query-builders";
import {
  buildMatchupQuery,
  buildTeamAtsQuery,
  buildTeamsQuery,
  type MatchupQuery,
  type TeamAtsQuery,
  type TeamsQuery,
  validateMatchupQuery,
  validateTeamAtsQuery,
  validateTeamsQuery,
} from "../cfbd/query-builders-reference";
import { asReferenceCfbdApi } from "../cfbd/api-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformMatchup,
  transformTeamAts,
} from "../transformers/reference-endpoints.ts";
import { transformTeams } from "../transformers/teams.ts";
import {
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import {
  filterRows, localFilters, numberMatches, parseNonNegativeInteger, parseNumber,
  stringMatches, validateOrderedRange, valueAt,
} from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

function teamNameMatches(row: Record<string, unknown>, search: string | undefined): boolean {
  if (search === undefined) return true;
  const labels = [row.school, row.mascot, row.abbreviation,
    ...(Array.isArray(row.alternate_names) ? row.alternate_names : [])];
  return labels.some((label) => typeof label === "string" && label.toLowerCase().includes(search));
}

export function registerTeamsCommand(program: Command, runtime: CommandRuntime): void {
  const teams = program
    .command("teams")
    .description("Retrieve college football teams")
    .option("--name <text>", "Local filter: case-insensitive school, mascot, abbreviation or alias substring")
    .option("--conference <value>", "Conference abbreviation")
    .option("--year <number>", "Historical affiliation year", parseInteger)
    .option("--classification <value>", "Local filter: division classification")
    .option("--city <value>", "Local filter: exact venue city (case-insensitive)")
    .option("--state <value>", "Local filter: exact venue state (case-insensitive)")
    .option("--min-capacity <number>", "Local filter: minimum venue capacity (inclusive)", parseNonNegativeInteger)
    .option("--max-capacity <number>", "Local filter: maximum venue capacity (inclusive)", parseNonNegativeInteger)
    .addHelpText(
      "after",
      "\nExamples:\n  fbs teams\n  fbs teams --conference ACC --year 2026\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { name, classification, city, state, minCapacity, maxCapacity, ...options } = suppliedOptions<
        Partial<TeamsQuery> & {
          name?: string; classification?: string; city?: string; state?: string;
          minCapacity?: number; maxCapacity?: number;
        }
      >(command);
      const filters = localFilters({ name, classification, city, state, minCapacity, maxCapacity });
      const nameSearch = (filters?.name as string | undefined)?.toLowerCase();
      const rawQuery = buildTeamsQuery(options);

      await withCommandContext("teams", rawQuery, async () => {
        validateOrderedRange(minCapacity, maxCapacity, "min-capacity", "max-capacity");
        const query = validateTeamsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "teams",
          endpoint: "/teams",
          query: asQueryRecord(query),
          resultKey: "teams",
          request: (api) => asReferenceCfbdApi(api).teams(query),
          transform: transformTeams,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(rows, (row) =>
              teamNameMatches(row, nameSearch) &&
              stringMatches(valueAt(row, "classification"), filters?.classification as string | undefined) &&
              stringMatches(valueAt(row, "location.city"), filters?.city as string | undefined) &&
              stringMatches(valueAt(row, "location.state"), filters?.state as string | undefined) &&
              numberMatches(valueAt(row, "location.capacity"), minCapacity, maxCapacity),
            ),
        });
      });
    });

  const fbs = teams
    .command("fbs")
    .description("Retrieve current or historical FBS teams")
    .option("--name <text>", "Local filter: case-insensitive school, mascot, abbreviation or alias substring")
    .option("--year <number>", "Season year", parseInteger)
    .option("--conference <value>", "Local filter: conference abbreviation")
    .option("--city <value>", "Local filter: exact venue city (case-insensitive)")
    .option("--state <value>", "Local filter: exact venue state (case-insensitive)")
    .option("--min-capacity <number>", "Local filter: minimum venue capacity (inclusive)", parseNonNegativeInteger)
    .option("--max-capacity <number>", "Local filter: maximum venue capacity (inclusive)", parseNonNegativeInteger)
    .addHelpText("after", "\nExample:\n  fbs teams fbs --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const { name, conference, city, state, minCapacity, maxCapacity, ...options } = suppliedLeafOptions<
        Partial<FbsTeamsQuery> & {
          name?: string; conference?: string; city?: string; state?: string;
          minCapacity?: number; maxCapacity?: number;
        }
      >(command);
      const filters = localFilters({ name, conference, city, state, minCapacity, maxCapacity });
      const nameSearch = (filters?.name as string | undefined)?.toLowerCase();
      const rawQuery = buildFbsTeamsQuery(options);

      await withCommandContext("teams fbs", rawQuery, async () => {
        validateOrderedRange(minCapacity, maxCapacity, "min-capacity", "max-capacity");
        const query = validateFbsTeamsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "teams fbs",
          endpoint: "/teams/fbs",
          query: asQueryRecord(query),
          resultKey: "teams",
          request: (api) => api.fbsTeams(query),
          transform: transformTeams,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(rows, (row) =>
              teamNameMatches(row, nameSearch) &&
              stringMatches(valueAt(row, "conference"), filters?.conference as string | undefined) &&
              stringMatches(valueAt(row, "location.city"), filters?.city as string | undefined) &&
              stringMatches(valueAt(row, "location.state"), filters?.state as string | undefined) &&
              numberMatches(valueAt(row, "location.capacity"), minCapacity, maxCapacity),
            ),
        });
      });
    });

  fbs.allowExcessArguments(false);

  const matchup = teams
    .command("matchup")
    .description("Retrieve the historical series between two teams")
    .option("--team1 <name>", "First team (required)")
    .option("--team2 <name>", "Second team (required)")
    .option("--min-year <number>", "Earliest season", parseInteger)
    .option("--max-year <number>", "Latest season", parseInteger)
    .addHelpText(
      "after",
      "\nExample:\n  fbs teams matchup --team1 \"Florida State\" --team2 Miami --min-year 2000\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<MatchupQuery>>(command);
      const rawQuery = buildMatchupQuery(options);

      await withCommandContext("teams matchup", rawQuery, async () => {
        const query = validateMatchupQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "teams matchup",
          endpoint: "/teams/matchup",
          query: asQueryRecord(query),
          resultKey: "matchup",
          request: (api) => asReferenceCfbdApi(api).matchup(query),
          transform: transformMatchup,
        });
      });
    });

  matchup.allowExcessArguments(false);

  const ats = teams
    .command("ats")
    .description("Retrieve historical team against-the-spread summaries")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--min-games <number>", "Local filter: minimum reported games (inclusive)", parseNonNegativeInteger)
    .option("--max-games <number>", "Local filter: maximum reported games (inclusive)", parseNonNegativeInteger)
    .option("--min-avg-cover-margin <number>", "Local filter: minimum average cover margin (inclusive)", parseNumber)
    .option("--max-avg-cover-margin <number>", "Local filter: maximum average cover margin (inclusive)", parseNumber)
    .addHelpText(
      "after",
      "\nHistorical, read-only data.\n\nExample:\n  fbs teams ats --year 2024 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minGames, maxGames, minAvgCoverMargin, maxAvgCoverMargin, ...options } = suppliedLeafOptions<
        Partial<TeamAtsQuery> & {
          minGames?: number; maxGames?: number;
          minAvgCoverMargin?: number; maxAvgCoverMargin?: number;
        }
      >(command);
      const filters = localFilters({ minGames, maxGames, minAvgCoverMargin, maxAvgCoverMargin });
      const rawQuery = buildTeamAtsQuery(options);

      await withCommandContext("teams ats", rawQuery, async () => {
        validateOrderedRange(minGames, maxGames, "min-games", "max-games");
        validateOrderedRange(minAvgCoverMargin, maxAvgCoverMargin, "min-avg-cover-margin", "max-avg-cover-margin");
        const query = validateTeamAtsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "teams ats",
          endpoint: "/teams/ats",
          query: asQueryRecord(query),
          resultKey: "team_ats",
          request: (api) => asReferenceCfbdApi(api).teamAts(query),
          transform: transformTeamAts,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) =>
            numberMatches(valueAt(row, "games"), minGames, maxGames) &&
            numberMatches(valueAt(row, "avg_cover_margin"), minAvgCoverMargin, maxAvgCoverMargin)),
        });
      });
    });

  ats.allowExcessArguments(false);
  teams.allowExcessArguments(false);
}

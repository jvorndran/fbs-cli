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
import { filterRows, localFilters, stringMatches, valueAt } from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerTeamsCommand(program: Command, runtime: CommandRuntime): void {
  const teams = program
    .command("teams")
    .description("Retrieve college football teams")
    .option("--conference <value>", "Conference abbreviation")
    .option("--year <number>", "Historical affiliation year", parseInteger)
    .option("--classification <value>", "Local filter: division classification")
    .addHelpText(
      "after",
      "\nExamples:\n  fbs teams\n  fbs teams --conference ACC --year 2026\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { classification, ...options } = suppliedOptions<
        Partial<TeamsQuery> & { classification?: string }
      >(command);
      const filters = localFilters({ classification });
      const rawQuery = buildTeamsQuery(options);

      await withCommandContext("teams", rawQuery, async () => {
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
              stringMatches(valueAt(row, "classification"), filters?.classification as string | undefined),
            ),
        });
      });
    });

  const fbs = teams
    .command("fbs")
    .description("Retrieve current or historical FBS teams")
    .option("--year <number>", "Season year", parseInteger)
    .option("--conference <value>", "Local filter: conference abbreviation")
    .addHelpText("after", "\nExample:\n  fbs teams fbs --year 2026\n")
    .action(async (_options: unknown, command: Command) => {
      const { conference, ...options } = suppliedLeafOptions<
        Partial<FbsTeamsQuery> & { conference?: string }
      >(command);
      const filters = localFilters({ conference });
      const rawQuery = buildFbsTeamsQuery(options);

      await withCommandContext("teams fbs", rawQuery, async () => {
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
              stringMatches(valueAt(row, "conference"), filters?.conference as string | undefined),
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
    .addHelpText(
      "after",
      "\nHistorical, read-only data.\n\nExample:\n  fbs teams ats --year 2024 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<TeamAtsQuery>>(command);
      const rawQuery = buildTeamAtsQuery(options);

      await withCommandContext("teams ats", rawQuery, async () => {
        const query = validateTeamAtsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "teams ats",
          endpoint: "/teams/ats",
          query: asQueryRecord(query),
          resultKey: "team_ats",
          request: (api) => asReferenceCfbdApi(api).teamAts(query),
          transform: transformTeamAts,
        });
      });
    });

  ats.allowExcessArguments(false);
  teams.allowExcessArguments(false);
}

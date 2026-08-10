import { Option, type Command } from "commander";

import {
  buildRecruitingGroupsQuery,
  buildRecruitingPlayersQuery,
  buildRecruitingTeamsQuery,
  type RecruitingGroupsQuery,
  type RecruitingPlayersQuery,
  type RecruitingTeamsQuery,
  validateRecruitingGroupsQuery,
  validateRecruitingPlayersQuery,
  validateRecruitingTeamsQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformRecruitingGroups,
  transformRecruitingPlayers,
  transformRecruitingTeams,
} from "../transformers/analytics-recruiting";
import { asAnalyticsApi } from "./analytics-shared";
import {
  filterRows,
  localFilters,
  numberMatches,
  parseNonNegativeInteger,
  parseNumber,
  stringMatches,
  valueAt,
} from "./local-filters";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

const RECRUIT_TYPES = ["JUCO", "PrepSchool", "HighSchool"] as const;

function registerPlayers(recruiting: Command, runtime: CommandRuntime): void {
  const players = recruiting
    .command("players")
    .description("Retrieve player recruiting rankings")
    .addOption(
      new Option("--classification <value>", "Recruit classification").choices([
        ...RECRUIT_TYPES,
      ]),
    )
    .option("--position <value>", "Position category")
    .option("--state <value>", "State or province")
    .option("--team <name>", "Committed team")
    .option("--year <number>", "Recruiting class year", parseInteger)
    .option("--min-stars <number>", "Local filter: minimum stars", parseNonNegativeInteger)
    .option("--min-rating <number>", "Local filter: minimum rating", parseNumber)
    .option("--max-ranking <number>", "Local filter: maximum ranking", parseNonNegativeInteger);
  players
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs recruiting players --year 2026\n  fbs recruiting players --team \"Florida State\" --position QB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minStars, minRating, maxRanking, ...options } = suppliedOptions<
        Partial<RecruitingPlayersQuery> & {
          minStars?: number;
          minRating?: number;
          maxRanking?: number;
        }
      >(command);
      const filters = localFilters({ minStars, minRating, maxRanking });
      const rawQuery = buildRecruitingPlayersQuery(options);
      await withCommandContext("recruiting players", rawQuery, async () => {
        const query = validateRecruitingPlayersQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "recruiting players",
          endpoint: "/recruiting/players",
          query: asQueryRecord(query),
          resultKey: "recruits",
          request: (api) => asAnalyticsApi(api).recruitingPlayers(query),
          transform: transformRecruitingPlayers,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                numberMatches(valueAt(row, "stars"), filters?.minStars as number | undefined, undefined) &&
                numberMatches(valueAt(row, "rating"), filters?.minRating as number | undefined, undefined) &&
                numberMatches(valueAt(row, "ranking"), undefined, filters?.maxRanking as number | undefined),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerTeams(recruiting: Command, runtime: CommandRuntime): void {
  const teams = recruiting
    .command("teams")
    .description("Retrieve team recruiting rankings")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Recruiting class year", parseInteger)
    .option("--max-rank <number>", "Local filter: maximum rank", parseNonNegativeInteger);
  teams
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs recruiting teams --year 2026\n  fbs recruiting teams --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { maxRank, ...options } = suppliedOptions<
        Partial<RecruitingTeamsQuery> & { maxRank?: number }
      >(command);
      const filters = localFilters({ maxRank });
      const rawQuery = buildRecruitingTeamsQuery(options);
      await withCommandContext("recruiting teams", rawQuery, async () => {
        const query = validateRecruitingTeamsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "recruiting teams",
          endpoint: "/recruiting/teams",
          query: asQueryRecord(query),
          resultKey: "team_rankings",
          request: (api) => asAnalyticsApi(api).recruitingTeams(query),
          transform: transformRecruitingTeams,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(rows, (row) => numberMatches(valueAt(row, "rank"), undefined, filters?.maxRank as number | undefined)),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGroups(recruiting: Command, runtime: CommandRuntime): void {
  const groups = recruiting
    .command("groups")
    .description("Retrieve recruiting ratings by team and position group")
    .option("--conference <value>", "Conference abbreviation")
    .option("--end-year <number>", "End of recruiting year range", parseInteger)
    .addOption(
      new Option("--recruit-type <value>", "Recruit type").choices([...RECRUIT_TYPES]),
    )
    .option("--start-year <number>", "Start of recruiting year range", parseInteger)
    .option("--team <name>", "Team name")
    .option("--position-group <value>", "Local filter: position group")
    .option("--min-commits <number>", "Local filter: minimum commits", parseNonNegativeInteger)
    .option("--min-average-stars <number>", "Local filter: minimum average stars", parseNumber);
  groups
    .addHelpText(
      "after",
      "\nAll filters are optional. --start-year must not exceed --end-year.\n\nExamples:\n  fbs recruiting groups --team \"Florida State\"\n  fbs recruiting groups --conference ACC --start-year 2020 --end-year 2025\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { positionGroup, minCommits, minAverageStars, ...options } = suppliedOptions<
        Partial<RecruitingGroupsQuery> & {
          positionGroup?: string;
          minCommits?: number;
          minAverageStars?: number;
        }
      >(command);
      const filters = localFilters({ positionGroup, minCommits, minAverageStars });
      const rawQuery = buildRecruitingGroupsQuery(options);
      await withCommandContext("recruiting groups", rawQuery, async () => {
        const query = validateRecruitingGroupsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "recruiting groups",
          endpoint: "/recruiting/groups",
          query: asQueryRecord(query),
          resultKey: "recruiting_groups",
          request: (api) => asAnalyticsApi(api).recruitingGroups(query),
          transform: transformRecruitingGroups,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(
                  valueAt(row, "position_group"),
                  filters?.positionGroup as string | undefined,
                ) &&
                numberMatches(valueAt(row, "commits"), filters?.minCommits as number | undefined, undefined) &&
                numberMatches(
                  valueAt(row, "average_stars"),
                  filters?.minAverageStars as number | undefined,
                  undefined,
                ),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerRecruitingCommand(
  program: Command,
  runtime: CommandRuntime,
): void {
  const recruiting = program
    .command("recruiting")
    .description("Retrieve recruiting rankings and ratings");
  recruiting.action((_options: unknown, command: Command) => command.outputHelp());
  registerPlayers(recruiting, runtime);
  registerTeams(recruiting, runtime);
  registerGroups(recruiting, runtime);
}

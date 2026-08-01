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
    .option("--year <number>", "Recruiting class year", parseInteger);
  players
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs recruiting players --year 2026\n  fbs recruiting players --team \"Florida State\" --position QB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RecruitingPlayersQuery>>(command);
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
    .option("--year <number>", "Recruiting class year", parseInteger);
  teams
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs recruiting teams --year 2026\n  fbs recruiting teams --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RecruitingTeamsQuery>>(command);
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
    .option("--team <name>", "Team name");
  groups
    .addHelpText(
      "after",
      "\nAll filters are optional. --start-year must not exceed --end-year.\n\nExamples:\n  fbs recruiting groups --team \"Florida State\"\n  fbs recruiting groups --conference ACC --start-year 2020 --end-year 2025\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RecruitingGroupsQuery>>(command);
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

import type { Command } from "commander";

import {
  buildWepaKickingQuery,
  buildWepaPassingQuery,
  buildWepaRushingQuery,
  buildWepaTeamSeasonQuery,
  type WepaKickingQuery,
  type WepaPassingQuery,
  type WepaRushingQuery,
  type WepaTeamSeasonQuery,
  validateWepaKickingQuery,
  validateWepaPassingQuery,
  validateWepaRushingQuery,
  validateWepaTeamSeasonQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformWepaKicking,
  transformWepaPassing,
  transformWepaRushing,
  transformWepaTeamSeason,
} from "../transformers/analytics-wepa";
import { asAnalyticsApi } from "./analytics-shared";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function addTeamSeasonFilters(command: Command): Command {
  return command
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
}

function registerTeamSeason(team: Command, runtime: CommandRuntime): void {
  const season = addTeamSeasonFilters(
    team.command("season").description("Retrieve opponent-adjusted team season metrics"),
  );
  season
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa team season --year 2025\n  fbs wepa team season --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<WepaTeamSeasonQuery>>(command);
      const rawQuery = buildWepaTeamSeasonQuery(options);
      await withCommandContext("wepa team season", rawQuery, async () => {
        const query = validateWepaTeamSeasonQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa team season",
          endpoint: "/wepa/team/season",
          query: asQueryRecord(query),
          resultKey: "team_metrics",
          request: (api) => asAnalyticsApi(api).wepaTeamSeason(query),
          transform: transformWepaTeamSeason,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPassing(players: Command, runtime: CommandRuntime): void {
  const passing = addTeamSeasonFilters(
    players.command("passing").description("Retrieve opponent-adjusted passing metrics"),
  ).option("--position <value>", "Position abbreviation");
  passing
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players passing --year 2025\n  fbs wepa players passing --team \"Florida State\" --position QB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<WepaPassingQuery>>(command);
      const rawQuery = buildWepaPassingQuery(options);
      await withCommandContext("wepa players passing", rawQuery, async () => {
        const query = validateWepaPassingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players passing",
          endpoint: "/wepa/players/passing",
          query: asQueryRecord(query),
          resultKey: "player_metrics",
          request: (api) => asAnalyticsApi(api).wepaPassing(query),
          transform: transformWepaPassing,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerRushing(players: Command, runtime: CommandRuntime): void {
  const rushing = addTeamSeasonFilters(
    players.command("rushing").description("Retrieve opponent-adjusted rushing metrics"),
  ).option("--position <value>", "Position abbreviation");
  rushing
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players rushing --year 2025\n  fbs wepa players rushing --team \"Florida State\" --position RB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<WepaRushingQuery>>(command);
      const rawQuery = buildWepaRushingQuery(options);
      await withCommandContext("wepa players rushing", rawQuery, async () => {
        const query = validateWepaRushingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players rushing",
          endpoint: "/wepa/players/rushing",
          query: asQueryRecord(query),
          resultKey: "player_metrics",
          request: (api) => asAnalyticsApi(api).wepaRushing(query),
          transform: transformWepaRushing,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerKicking(players: Command, runtime: CommandRuntime): void {
  const kicking = addTeamSeasonFilters(
    players.command("kicking").description("Retrieve kicker PAAR ratings"),
  );
  kicking
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players kicking --year 2025\n  fbs wepa players kicking --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<WepaKickingQuery>>(command);
      const rawQuery = buildWepaKickingQuery(options);
      await withCommandContext("wepa players kicking", rawQuery, async () => {
        const query = validateWepaKickingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players kicking",
          endpoint: "/wepa/players/kicking",
          query: asQueryRecord(query),
          resultKey: "kicker_ratings",
          request: (api) => asAnalyticsApi(api).wepaKicking(query),
          transform: transformWepaKicking,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerWepaCommand(program: Command, runtime: CommandRuntime): void {
  const wepa = program.command("wepa").description("Retrieve opponent-adjusted metrics");
  wepa.action((_options: unknown, command: Command) => command.outputHelp());

  const team = wepa.command("team").description("Team WEPA metrics");
  team.action((_options: unknown, command: Command) => command.outputHelp());
  registerTeamSeason(team, runtime);

  const players = wepa.command("players").description("Player WEPA metrics");
  players.action((_options: unknown, command: Command) => command.outputHelp());
  registerPassing(players, runtime);
  registerRushing(players, runtime);
  registerKicking(players, runtime);
}

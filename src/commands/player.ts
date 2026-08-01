import type { Command } from "commander";

import { asStatisticsCfbdApi } from "../cfbd/api-statistics";
import {
  buildPlayerSearchQuery,
  buildPlayerSeasonOverviewQuery,
  buildReturningProductionQuery,
  buildTransferPortalQuery,
  type PlayerSearchQuery,
  type PlayerSeasonOverviewQuery,
  type ReturningProductionQuery,
  type TransferPortalQuery,
  validatePlayerSearchQuery,
  validatePlayerSeasonOverviewQuery,
  validateReturningProductionQuery,
  validateTransferPortalQuery,
} from "../cfbd/query-builders-statistics";
import {
  buildPlayerUsageQuery,
  type PlayerUsageQuery,
  validatePlayerUsageQuery,
} from "../cfbd/query-builders";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformPlayerUsage } from "../transformers/player-usage.ts";
import {
  transformPlayerSearch,
  transformPlayerSeasonOverview,
  transformReturningProduction,
  transformTransferPortal,
} from "../transformers/players.ts";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerPlayerUsage(player: Command, runtime: CommandRuntime): void {
  player
    .command("usage")
    .description("Retrieve player usage metrics for a season")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--player-id <number>", "Player ID", parseInteger)
    .option("--position <value>", "Position abbreviation")
    .option("--exclude-garbage-time", "Exclude garbage-time plays")
    .addHelpText(
      "after",
      "\nExamples:\n  fbs player usage --year 2026 --team \"Florida State\"\n  fbs player usage --year 2026 --player-id 4433971 --exclude-garbage-time\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlayerUsageQuery>>(command, [
        "excludeGarbageTime",
      ]);
      const rawQuery = buildPlayerUsageQuery(options);

      await withCommandContext("player usage", rawQuery, async () => {
        const query = validatePlayerUsageQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "player usage",
          endpoint: "/player/usage",
          query: asQueryRecord(query),
          resultKey: "player_usage",
          request: (api) => api.playerUsage(query),
          transform: transformPlayerUsage,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPlayerSearch(player: Command, runtime: CommandRuntime): void {
  player
    .command("search")
    .description("Search for players by name")
    .option("--search-term <name>", "Player name search term (required)")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--position <value>", "Position abbreviation")
    .addHelpText(
      "after",
      "\n--search-term is required.\n\nExamples:\n  fbs player search --search-term \"Jordan Travis\"\n  fbs player search --search-term Travis --year 2023 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlayerSearchQuery>>(command);
      const rawQuery = buildPlayerSearchQuery(options);

      await withCommandContext("player search", rawQuery, async () => {
        const query = validatePlayerSearchQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "player search",
          endpoint: "/player/search",
          query: asQueryRecord(query),
          resultKey: "players",
          request: (api) => asStatisticsCfbdApi(api).playerSearch(query),
          transform: transformPlayerSearch,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPlayerSeason(player: Command, runtime: CommandRuntime): void {
  const season = player.command("season").description("Player season resources");
  season.action((_options: unknown, command: Command) => command.outputHelp());

  season
    .command("overview")
    .description("Retrieve a player's season overview")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--player-id <number>", "Player ID (required)", parseInteger)
    .addHelpText(
      "after",
      "\nBoth --year and --player-id are required.\n\nExample:\n  fbs player season overview --year 2023 --player-id 4360248\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlayerSeasonOverviewQuery>>(command);
      const rawQuery = buildPlayerSeasonOverviewQuery(options);

      await withCommandContext("player season overview", rawQuery, async () => {
        const query = validatePlayerSeasonOverviewQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "player season overview",
          endpoint: "/player/season/overview",
          query: asQueryRecord(query),
          resultKey: "player_season_overview",
          request: (api) => asStatisticsCfbdApi(api).playerSeasonOverview(query),
          transform: transformPlayerSeasonOverview,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerReturningProduction(
  player: Command,
  runtime: CommandRuntime,
): void {
  player
    .command("returning")
    .description("Retrieve returning production metrics")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs player returning --year 2026\n  fbs player returning --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<ReturningProductionQuery>>(command);
      const rawQuery = buildReturningProductionQuery(options);

      await withCommandContext("player returning", rawQuery, async () => {
        const query = validateReturningProductionQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "player returning",
          endpoint: "/player/returning",
          query: asQueryRecord(query),
          resultKey: "returning_production",
          request: (api) => asStatisticsCfbdApi(api).returningProduction(query),
          transform: transformReturningProduction,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerTransferPortal(player: Command, runtime: CommandRuntime): void {
  player
    .command("portal")
    .description("Retrieve transfer portal entries")
    .option("--year <number>", "Portal season year (required)", parseInteger)
    .addHelpText(
      "after",
      "\n--year is required.\n\nExample:\n  fbs player portal --year 2026\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<TransferPortalQuery>>(command);
      const rawQuery = buildTransferPortalQuery(options);

      await withCommandContext("player portal", rawQuery, async () => {
        const query = validateTransferPortalQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "player portal",
          endpoint: "/player/portal",
          query: asQueryRecord(query),
          resultKey: "transfers",
          request: (api) => asStatisticsCfbdApi(api).transferPortal(query),
          transform: transformTransferPortal,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerPlayerCommand(program: Command, runtime: CommandRuntime): void {
  const player = program.command("player").description("Player data resources");
  player.action((_options: unknown, command: Command) => command.outputHelp());
  registerPlayerUsage(player, runtime);
  registerPlayerSearch(player, runtime);
  registerPlayerSeason(player, runtime);
  registerReturningProduction(player, runtime);
  registerTransferPortal(player, runtime);
}

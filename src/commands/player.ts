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
import {
  filterRows,
  isObject,
  localFilters,
  numberMatches,
  parseDate,
  parseNonNegativeInteger,
  parseNumber,
  stringMatches,
  validateDateRange,
  valueAt,
} from "./local-filters";
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
    .option("--origin <name>", "Local filter: originating team")
    .option("--destination <name>", "Local filter: destination team")
    .option("--position <value>", "Local filter: position")
    .option("--eligibility <value>", "Local filter: eligibility")
    .option("--min-rating <number>", "Local filter: minimum rating", parseNumber)
    .option("--min-stars <number>", "Local filter: minimum stars", parseNonNegativeInteger)
    .option("--from-date <date>", "Local filter: transfer date on or after YYYY-MM-DD", parseDate)
    .option("--to-date <date>", "Local filter: transfer date on or before YYYY-MM-DD", parseDate)
    .addHelpText(
      "after",
      "\n--year is required.\n\nExample:\n  fbs player portal --year 2026\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const {
        origin,
        destination,
        position,
        eligibility,
        minRating,
        minStars,
        fromDate,
        toDate,
        ...options
      } = suppliedOptions<
        Partial<TransferPortalQuery> & {
          origin?: string;
          destination?: string;
          position?: string;
          eligibility?: string;
          minRating?: number;
          minStars?: number;
          fromDate?: string;
          toDate?: string;
        }
      >(command);
      validateDateRange(fromDate, toDate);
      const filters = localFilters({
        origin,
        destination,
        position,
        eligibility,
        minRating,
        minStars,
        fromDate,
        toDate,
      });
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
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) => {
                if (!isObject(row)) return false;
                const transferDate = valueAt(row, "transfer_date");
                const date = typeof transferDate === "string" ? transferDate.slice(0, 10) : undefined;
                return (
                  stringMatches(valueAt(row, "origin"), filters?.origin as string | undefined) &&
                  stringMatches(
                    valueAt(row, "destination"),
                    filters?.destination as string | undefined,
                  ) &&
                  stringMatches(valueAt(row, "position"), filters?.position as string | undefined) &&
                  stringMatches(valueAt(row, "eligibility"), filters?.eligibility as string | undefined) &&
                  numberMatches(valueAt(row, "rating"), filters?.minRating as number | undefined, undefined) &&
                  numberMatches(valueAt(row, "stars"), filters?.minStars as number | undefined, undefined) &&
                  (filters?.fromDate === undefined || (date !== undefined && date >= filters.fromDate)) &&
                  (filters?.toDate === undefined || (date !== undefined && date <= filters.toDate))
                );
              },
            ),
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

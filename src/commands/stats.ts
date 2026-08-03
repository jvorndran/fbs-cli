import type { Command } from "commander";

import { asStatisticsCfbdApi } from "../cfbd/api-statistics";
import {
  buildGameHavocStatsQuery,
  buildPlayerGameSuccessQuery,
  buildPlayerSeasonStatsQuery,
  buildPlayerSeasonSuccessQuery,
  buildTeamSeasonStatsQuery,
  type GameHavocStatsQuery,
  type PlayerGameSuccessQuery,
  type PlayerSeasonStatsQuery,
  type PlayerSeasonSuccessQuery,
  type TeamSeasonStatsQuery,
  validateGameHavocStatsQuery,
  validatePlayerGameSuccessQuery,
  validatePlayerSeasonStatsQuery,
  validatePlayerSeasonSuccessQuery,
  validateTeamSeasonStatsQuery,
} from "../cfbd/query-builders-statistics";
import {
  buildAdvancedGameStatsQuery,
  buildAdvancedSeasonStatsQuery,
  type AdvancedGameStatsQuery,
  type AdvancedSeasonStatsQuery,
  validateAdvancedGameStatsQuery,
  validateAdvancedSeasonStatsQuery,
} from "../cfbd/query-builders";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformAdvancedGameStats,
  transformAdvancedSeasonStats,
} from "../transformers/advanced-stats.ts";
import {
  transformGameHavocStats,
  transformPlayerGameSuccessRates,
  transformPlayerSeasonStats,
  transformPlayerSeasonSuccessRates,
  transformStatCategories,
  transformTeamSeasonStats,
} from "../transformers/statistics.ts";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerAdvancedGameStats(game: Command, runtime: CommandRuntime): void {
  const advanced = game
    .command("advanced")
    .description("Retrieve advanced game statistics")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--opponent <name>", "Opponent name")
    .option("--exclude-garbage-time", "Exclude garbage-time plays");

  addSeasonTypeOption(advanced);
  advanced
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs stats game advanced --year 2026 --team \"Florida State\"\n  fbs stats game advanced --year 2026 --week 1 --exclude-garbage-time\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<AdvancedGameStatsQuery>>(command, [
        "excludeGarbageTime",
      ]);
      const rawQuery = buildAdvancedGameStatsQuery(options);

      await withCommandContext("stats game advanced", rawQuery, async () => {
        const query = validateAdvancedGameStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats game advanced",
          endpoint: "/stats/game/advanced",
          query: asQueryRecord(query),
          resultKey: "advanced_game_stats",
          request: (api) => api.advancedGameStats(query),
          transform: transformAdvancedGameStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGameHavocStats(game: Command, runtime: CommandRuntime): void {
  const havoc = game
    .command("havoc")
    .description("Retrieve havoc statistics aggregated by game")
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--opponent <name>", "Opponent name");

  addSeasonTypeOption(havoc);
  havoc
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs stats game havoc --year 2026 --week 1\n  fbs stats game havoc --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<GameHavocStatsQuery>>(command);
      const rawQuery = buildGameHavocStatsQuery(options);

      await withCommandContext("stats game havoc", rawQuery, async () => {
        const query = validateGameHavocStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats game havoc",
          endpoint: "/stats/game/havoc",
          query: asQueryRecord(query),
          resultKey: "game_havoc_stats",
          request: (api) => asStatisticsCfbdApi(api).gameHavocStats(query),
          transform: transformGameHavocStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerStatsGame(stats: Command, runtime: CommandRuntime): void {
  const game = stats.command("game").description("Game-level statistics");
  game.action((_options: unknown, command: Command) => command.outputHelp());
  registerAdvancedGameStats(game, runtime);
  registerGameHavocStats(game, runtime);
}

function registerAdvancedSeasonStats(season: Command, runtime: CommandRuntime): void {
  const advanced = season
    .command("advanced")
    .description("Retrieve advanced season statistics")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--start-week <number>", "First week in range, including 0", parseInteger)
    .option("--end-week <number>", "Last week in range, including 0", parseInteger)
    .option("--exclude-garbage-time", "Exclude garbage-time plays");

  addClassificationOption(advanced);
  advanced
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs stats season advanced --year 2026 --team \"Florida State\"\n  fbs stats season advanced --year 2026 --start-week 1 --end-week 6 --exclude-garbage-time\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<AdvancedSeasonStatsQuery>>(command, [
        "excludeGarbageTime",
      ]);
      const rawQuery = buildAdvancedSeasonStatsQuery(options);

      await withCommandContext("stats season advanced", rawQuery, async () => {
        const query = validateAdvancedSeasonStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats season advanced",
          endpoint: "/stats/season/advanced",
          query: asQueryRecord(query),
          resultKey: "advanced_season_stats",
          request: (api) => api.advancedSeasonStats(query),
          transform: transformAdvancedSeasonStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerStatsSeason(stats: Command, runtime: CommandRuntime): void {
  const season = stats
    .command("season")
    .description("Retrieve aggregated team season statistics")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--start-week <number>", "First week in range, including 0", parseInteger)
    .option("--end-week <number>", "Last week in range, including 0", parseInteger);

  addClassificationOption(season);
  season
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs stats season --year 2026\n  fbs stats season --team \"Florida State\" --start-week 1 --end-week 6\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<TeamSeasonStatsQuery>>(command);
      const rawQuery = buildTeamSeasonStatsQuery(options);

      await withCommandContext("stats season", rawQuery, async () => {
        const query = validateTeamSeasonStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats season",
          endpoint: "/stats/season",
          query: asQueryRecord(query),
          resultKey: "team_stats",
          request: (api) => asStatisticsCfbdApi(api).teamSeasonStats(query),
          transform: transformTeamSeasonStats,
        });
      });
    })
    .allowExcessArguments(false);

  registerAdvancedSeasonStats(season, runtime);
}

function registerStatsPlayerSeason(player: Command, runtime: CommandRuntime): void {
  const season = player
    .command("season")
    .description("Retrieve aggregated player statistics for a season")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--start-week <number>", "First week in range, including 0", parseInteger)
    .option("--end-week <number>", "Last week in range, including 0", parseInteger)
    .option("--category <value>", "Statistical category");

  addSeasonTypeOption(season);
  season
    .addHelpText(
      "after",
      "\n--year is required.\n\nExamples:\n  fbs stats player season --year 2026\n  fbs stats player season --year 2026 --team \"Florida State\" --category passing\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlayerSeasonStatsQuery>>(command);
      const rawQuery = buildPlayerSeasonStatsQuery(options);

      await withCommandContext("stats player season", rawQuery, async () => {
        const query = validatePlayerSeasonStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats player season",
          endpoint: "/stats/player/season",
          query: asQueryRecord(query),
          resultKey: "player_season_stats",
          request: (api) => asStatisticsCfbdApi(api).playerSeasonStats(query),
          transform: transformPlayerSeasonStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerStatsPlayerGameSuccess(
  success: Command,
  runtime: CommandRuntime,
): void {
  const game = success
    .command("game")
    .description("Retrieve player success rates by game")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--player-id <number>", "Player ID", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--threshold <number>", "Minimum credited plays", parseInteger)
    .option("--exclude-garbage-time", "Exclude garbage-time plays");

  addSeasonTypeOption(game);
  game
    .addHelpText(
      "after",
      "\n--year and at least one of --week, --team, or --player-id are required.\n\nExamples:\n  fbs stats player success game --year 2026 --week 1\n  fbs stats player success game --year 2026 --player-id 4433971\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<PlayerGameSuccessQuery>>(command, [
        "excludeGarbageTime",
      ]);
      const rawQuery = buildPlayerGameSuccessQuery(options);

      await withCommandContext("stats player success game", rawQuery, async () => {
        const query = validatePlayerGameSuccessQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats player success game",
          endpoint: "/stats/player/success/game",
          query: asQueryRecord(query),
          resultKey: "player_game_success_rates",
          request: (api) => asStatisticsCfbdApi(api).playerGameSuccessRates(query),
          transform: transformPlayerGameSuccessRates,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerStatsPlayerSuccess(player: Command, runtime: CommandRuntime): void {
  const success = player
    .command("success")
    .description("Retrieve player success rates by season")
    .option("--year <number>", "Season year", parseInteger)
    .option("--player-id <number>", "Player ID", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--start-week <number>", "First week in range, including 0", parseInteger)
    .option("--end-week <number>", "Last week in range, including 0", parseInteger)
    .option("--threshold <number>", "Minimum credited plays", parseInteger)
    .option("--exclude-garbage-time", "Exclude garbage-time plays");

  addSeasonTypeOption(success);
  success
    .addHelpText(
      "after",
      "\nAt least one of --year or --player-id is required.\n\nExamples:\n  fbs stats player success --year 2026 --team \"Florida State\"\n  fbs stats player success --player-id 4433971\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlayerSeasonSuccessQuery>>(command, [
        "excludeGarbageTime",
      ]);
      const rawQuery = buildPlayerSeasonSuccessQuery(options);

      await withCommandContext("stats player success", rawQuery, async () => {
        const query = validatePlayerSeasonSuccessQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "stats player success",
          endpoint: "/stats/player/success",
          query: asQueryRecord(query),
          resultKey: "player_success_rates",
          request: (api) => asStatisticsCfbdApi(api).playerSeasonSuccessRates(query),
          transform: transformPlayerSeasonSuccessRates,
        });
      });
    })
    .allowExcessArguments(false);

  registerStatsPlayerGameSuccess(success, runtime);
}

function registerStatsPlayer(stats: Command, runtime: CommandRuntime): void {
  const player = stats.command("player").description("Player statistics");
  player.action((_options: unknown, command: Command) => command.outputHelp());
  registerStatsPlayerSeason(player, runtime);
  registerStatsPlayerSuccess(player, runtime);
}

function registerStatsCategories(stats: Command, runtime: CommandRuntime): void {
  stats
    .command("categories")
    .description("Retrieve available team statistical categories")
    .addHelpText("after", "\nExample:\n  fbs stats categories\n")
    .action(async () => {
      const query = {};
      await withCommandContext("stats categories", query, async () => {
        await runEndpoint(runtime, {
          command: "stats categories",
          endpoint: "/stats/categories",
          query,
          resultKey: "categories",
          request: (api) => asStatisticsCfbdApi(api).statCategories(),
          transform: transformStatCategories,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerStatsCommand(program: Command, runtime: CommandRuntime): void {
  const stats = program.command("stats").description("Statistics resources");
  stats.action((_options: unknown, command: Command) => command.outputHelp());
  registerStatsGame(stats, runtime);
  registerStatsSeason(stats, runtime);
  registerStatsPlayer(stats, runtime);
  registerStatsCategories(stats, runtime);
}

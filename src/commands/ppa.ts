import type { Command } from "commander";

import { asStatisticsCfbdApi } from "../cfbd/api-statistics";
import {
  buildGamePpaQuery,
  buildPlayerGamePpaQuery,
  buildPlayerSeasonPpaQuery,
  buildPredictedPointsQuery,
  buildTeamPpaQuery,
  type GamePpaQuery,
  type PlayerGamePpaQuery,
  type PlayerSeasonPpaQuery,
  type PredictedPointsQuery,
  type TeamPpaQuery,
  validateGamePpaQuery,
  validatePlayerGamePpaQuery,
  validatePlayerSeasonPpaQuery,
  validatePredictedPointsQuery,
  validateTeamPpaQuery,
} from "../cfbd/query-builders-statistics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformGamePpa,
  transformPlayerGamePpa,
  transformPlayerSeasonPpa,
  transformPredictedPoints,
  transformTeamPpa,
} from "../transformers/ppa.ts";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedOptions,
} from "./options";
import {
  filterRows,
  isObject,
  localFilters,
  numberMatches,
  parseNumber,
  stringMatches,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

function registerPredictedPoints(ppa: Command, runtime: CommandRuntime): void {
  ppa
    .command("predicted")
    .description("Retrieve predicted points by down and distance")
    .option("--down <number>", "Down from 1 through 4 (required)", parseInteger)
    .option("--distance <number>", "Yards to gain (required)", parseInteger)
    .addHelpText(
      "after",
      "\nBoth --down and --distance are required.\n\nExample:\n  fbs ppa predicted --down 1 --distance 10\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PredictedPointsQuery>>(command);
      const rawQuery = buildPredictedPointsQuery(options);

      await withCommandContext("ppa predicted", rawQuery, async () => {
        const query = validatePredictedPointsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ppa predicted",
          endpoint: "/ppa/predicted",
          query: asQueryRecord(query),
          resultKey: "predicted_points",
          request: (api) => asStatisticsCfbdApi(api).predictedPoints(query),
          transform: transformPredictedPoints,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerTeamPpa(ppa: Command, runtime: CommandRuntime): void {
  const teams = ppa
    .command("teams")
    .description("Retrieve season PPA aggregated by team")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--exclude-garbage-time", "Exclude garbage-time plays")
    .option("--min-offense-ppa <number>", "Local filter: minimum offense overall PPA (inclusive)", parseNumber)
    .option("--max-offense-ppa <number>", "Local filter: maximum offense overall PPA (inclusive)", parseNumber)
    .option("--min-defense-ppa <number>", "Local filter: minimum defense overall PPA (inclusive)", parseNumber)
    .option("--max-defense-ppa <number>", "Local filter: maximum defense overall PPA (inclusive)", parseNumber);

  addClassificationOption(teams);
  teams
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ppa teams --year 2026\n  fbs ppa teams --team \"Florida State\" --exclude-garbage-time\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minOffensePpa, maxOffensePpa, minDefensePpa, maxDefensePpa, ...options } = suppliedOptions<
        Partial<TeamPpaQuery> & {
          minOffensePpa?: number;
          maxOffensePpa?: number;
          minDefensePpa?: number;
          maxDefensePpa?: number;
        }
      >(command, [
        "excludeGarbageTime",
      ]);
      const filters = localFilters({ minOffensePpa, maxOffensePpa, minDefensePpa, maxDefensePpa });
      const rawQuery = buildTeamPpaQuery(options);

      await withCommandContext("ppa teams", rawQuery, async () => {
        validateOrderedRange(minOffensePpa, maxOffensePpa, "min-offense-ppa", "max-offense-ppa");
        validateOrderedRange(minDefensePpa, maxDefensePpa, "min-defense-ppa", "max-defense-ppa");
        const query = validateTeamPpaQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ppa teams",
          endpoint: "/ppa/teams",
          query: asQueryRecord(query),
          resultKey: "team_ppa",
          request: (api) => asStatisticsCfbdApi(api).teamPpa(query),
          transform: transformTeamPpa,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) =>
                isObject(row) &&
                numberMatches(valueAt(row, "offense.overall"), minOffensePpa, maxOffensePpa) &&
                numberMatches(valueAt(row, "defense.overall"), minDefensePpa, maxDefensePpa)),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGamePpa(ppa: Command, runtime: CommandRuntime): void {
  const games = ppa
    .command("games")
    .description("Retrieve PPA aggregated by game and team")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--exclude-garbage-time", "Exclude garbage-time plays")
    .option("--min-offense-ppa <number>", "Local filter: minimum offense overall PPA (inclusive)", parseNumber)
    .option("--max-offense-ppa <number>", "Local filter: maximum offense overall PPA (inclusive)", parseNumber)
    .option("--min-defense-ppa <number>", "Local filter: minimum defense overall PPA (inclusive)", parseNumber)
    .option("--max-defense-ppa <number>", "Local filter: maximum defense overall PPA (inclusive)", parseNumber)
    .option("--game-id <number>", "Local filter: game ID", parseInteger)
    .option("--opponent <name>", "Local filter: opponent");

  addSeasonTypeOption(games);
  addClassificationOption(games);
  games
    .addHelpText(
      "after",
      "\n--year is required.\n\nExamples:\n  fbs ppa games --year 2026\n  fbs ppa games --year 2026 --week 1 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { gameId, opponent, minOffensePpa, maxOffensePpa, minDefensePpa, maxDefensePpa, ...options } = suppliedOptions<
        Partial<GamePpaQuery> & {
          gameId?: number;
          opponent?: string;
          minOffensePpa?: number;
          maxOffensePpa?: number;
          minDefensePpa?: number;
          maxDefensePpa?: number;
        }
      >(command, [
        "excludeGarbageTime",
      ]);
      const filters = localFilters({ gameId, opponent, minOffensePpa, maxOffensePpa, minDefensePpa, maxDefensePpa });
      const rawQuery = buildGamePpaQuery(options);

      await withCommandContext("ppa games", rawQuery, async () => {
        validateOrderedRange(minOffensePpa, maxOffensePpa, "min-offense-ppa", "max-offense-ppa");
        validateOrderedRange(minDefensePpa, maxDefensePpa, "min-defense-ppa", "max-defense-ppa");
        const query = validateGamePpaQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ppa games",
          endpoint: "/ppa/games",
          query: asQueryRecord(query),
          resultKey: "game_ppa",
          request: (api) => asStatisticsCfbdApi(api).gamePpa(query),
          transform: transformGamePpa,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                isObject(row) &&
                (filters?.gameId === undefined || valueAt(row, "game_id") === filters.gameId) &&
                stringMatches(valueAt(row, "opponent"), filters?.opponent as string | undefined) &&
                numberMatches(valueAt(row, "offense.overall"), minOffensePpa, maxOffensePpa) &&
                numberMatches(valueAt(row, "defense.overall"), minDefensePpa, maxDefensePpa),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPlayerGamePpa(players: Command, runtime: CommandRuntime): void {
  const games = players
    .command("games")
    .description("Retrieve PPA by player and game")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--position <value>", "Position abbreviation")
    .option("--player-id <id>", "Player ID")
    .option("--threshold <number>", "Minimum credited plays", parseInteger)
    .option("--exclude-garbage-time", "Exclude garbage-time plays")
    .option("--min-average-ppa <number>", "Local filter: minimum average all-play PPA (inclusive)", parseNumber)
    .option("--max-average-ppa <number>", "Local filter: maximum average all-play PPA (inclusive)", parseNumber)
    .option("--game-id <number>", "Local filter: game ID", parseInteger)
    .option("--player <name>", "Local filter: player")
    .option("--opponent <name>", "Local filter: opponent");

  addSeasonTypeOption(games);
  games
    .addHelpText(
      "after",
      "\n--year and at least one of --week or --team are required.\n\nExamples:\n  fbs ppa players games --year 2026 --week 1\n  fbs ppa players games --year 2026 --team \"Florida State\" --player-id 4433971\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { gameId, player: playerName, opponent, minAveragePpa, maxAveragePpa, ...options } = suppliedOptions<
        Partial<PlayerGamePpaQuery> & {
          gameId?: number;
          player?: string;
          opponent?: string;
          minAveragePpa?: number;
          maxAveragePpa?: number;
        }
      >(command, [
        "excludeGarbageTime",
      ]);
      const filters = localFilters({ gameId, player: playerName, opponent, minAveragePpa, maxAveragePpa });
      const rawQuery = buildPlayerGamePpaQuery(options);

      await withCommandContext("ppa players games", rawQuery, async () => {
        validateOrderedRange(minAveragePpa, maxAveragePpa, "min-average-ppa", "max-average-ppa");
        const query = validatePlayerGamePpaQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ppa players games",
          endpoint: "/ppa/players/games",
          query: asQueryRecord(query),
          resultKey: "player_game_ppa",
          request: (api) => asStatisticsCfbdApi(api).playerGamePpa(query),
          transform: transformPlayerGamePpa,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                isObject(row) &&
                (filters?.gameId === undefined || valueAt(row, "game_id") === filters.gameId) &&
                stringMatches(valueAt(row, "name", "player"), filters?.player as string | undefined) &&
                stringMatches(valueAt(row, "opponent"), filters?.opponent as string | undefined) &&
                numberMatches(valueAt(row, "average_ppa.all"), minAveragePpa, maxAveragePpa),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPlayerSeasonPpa(players: Command, runtime: CommandRuntime): void {
  players
    .command("season")
    .description("Retrieve season PPA aggregated by player")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--position <value>", "Position abbreviation")
    .option("--player-id <id>", "Player ID")
    .option("--threshold <number>", "Minimum credited plays", parseInteger)
    .option("--exclude-garbage-time", "Exclude garbage-time plays")
    .option("--player <name>", "Local filter: player")
    .option("--min-average-ppa <number>", "Local filter: minimum average PPA, all plays (inclusive)", parseNumber)
    .option("--max-average-ppa <number>", "Local filter: maximum average PPA, all plays (inclusive)", parseNumber)
    .option("--min-total-ppa <number>", "Local filter: minimum total PPA, all plays (inclusive)", parseNumber)
    .option("--max-total-ppa <number>", "Local filter: maximum total PPA, all plays (inclusive)", parseNumber)
    .addHelpText(
      "after",
      "\nAt least one of --year or --player-id is required.\n\nExamples:\n  fbs ppa players season --year 2026 --team \"Florida State\"\n  fbs ppa players season --player-id 4433971\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { player: playerName, minAveragePpa, maxAveragePpa, minTotalPpa, maxTotalPpa, ...options } = suppliedOptions<
        Partial<PlayerSeasonPpaQuery> & {
          player?: string;
          minAveragePpa?: number;
          maxAveragePpa?: number;
          minTotalPpa?: number;
          maxTotalPpa?: number;
        }
      >(command, [
        "excludeGarbageTime",
      ]);
      const filters = localFilters({ player: playerName, minAveragePpa, maxAveragePpa, minTotalPpa, maxTotalPpa });
      const rawQuery = buildPlayerSeasonPpaQuery(options);

      await withCommandContext("ppa players season", rawQuery, async () => {
        validateOrderedRange(minAveragePpa, maxAveragePpa, "min-average-ppa", "max-average-ppa");
        validateOrderedRange(minTotalPpa, maxTotalPpa, "min-total-ppa", "max-total-ppa");
        const query = validatePlayerSeasonPpaQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ppa players season",
          endpoint: "/ppa/players/season",
          query: asQueryRecord(query),
          resultKey: "player_season_ppa",
          request: (api) => asStatisticsCfbdApi(api).playerSeasonPpa(query),
          transform: transformPlayerSeasonPpa,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                isObject(row) &&
                stringMatches(valueAt(row, "name", "player"), filters?.player as string | undefined) &&
                numberMatches(valueAt(row, "average_ppa.all"), minAveragePpa, maxAveragePpa) &&
                numberMatches(valueAt(row, "total_ppa.all"), minTotalPpa, maxTotalPpa),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPlayerPpa(ppa: Command, runtime: CommandRuntime): void {
  const players = ppa.command("players").description("Player PPA resources");
  players.action((_options: unknown, command: Command) => command.outputHelp());
  registerPlayerGamePpa(players, runtime);
  registerPlayerSeasonPpa(players, runtime);
}

export function registerPpaCommand(program: Command, runtime: CommandRuntime): void {
  const ppa = program.command("ppa").description("Predicted points added resources");
  ppa.action((_options: unknown, command: Command) => command.outputHelp());
  registerPredictedPoints(ppa, runtime);
  registerTeamPpa(ppa, runtime);
  registerGamePpa(ppa, runtime);
  registerPlayerPpa(ppa, runtime);
}

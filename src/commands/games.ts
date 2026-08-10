import { Option, type Command } from "commander";

import {
  buildGamePlayerStatsQuery,
  buildGamesQuery,
  buildGameTeamStatsQuery,
  buildWeatherQuery,
  type GamePlayerStatsQuery,
  type GamesQuery,
  type GameTeamStatsQuery,
  type WeatherQuery,
  validateGamePlayerStatsQuery,
  validateGamesQuery,
  validateGameTeamStatsQuery,
  validateWeatherQuery,
} from "../cfbd/query-builders";
import {
  buildMediaQuery,
  type MediaQuery,
  validateMediaQuery,
} from "../cfbd/query-builders-reference";
import { asReferenceCfbdApi } from "../cfbd/api-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformGames } from "../transformers/games.ts";
import { transformPlayerGameStats } from "../transformers/player-game-stats.ts";
import { transformGameMedia } from "../transformers/reference-endpoints.ts";
import { transformTeamGameStats } from "../transformers/team-game-stats.ts";
import { transformWeather } from "../transformers/weather.ts";
import {
  addClassificationOption,
  addPlayoffOptions,
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import {
  booleanMatches,
  filterRows,
  localFilters,
  numberMatches,
  parseBoolean,
  parseNumber,
  stringMatches,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

function registerGameTeamsCommand(games: Command, runtime: CommandRuntime): void {
  const teams = games
    .command("teams")
    .description("Retrieve team box score statistics")
    .option("--id <number>", "Game ID", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation");

  addSeasonTypeOption(teams);
  addClassificationOption(teams);
  teams
    .addHelpText(
      "after",
      "\nQuery by --id, or use --year with at least one of --week, --team, or --conference.\n\nExamples:\n  fbs games teams --id 401752731\n  fbs games teams --year 2026 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<GameTeamStatsQuery>>(command);
      const rawQuery = buildGameTeamStatsQuery(options);

      await withCommandContext("games teams", rawQuery, async () => {
        const query = validateGameTeamStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "games teams",
          endpoint: "/games/teams",
          query: asQueryRecord(query),
          resultKey: "games",
          request: (api) => api.gameTeamStats(query),
          transform: transformTeamGameStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGamePlayersCommand(games: Command, runtime: CommandRuntime): void {
  const players = games
    .command("players")
    .description("Retrieve player box score statistics")
    .option("--id <number>", "Game ID", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--category <value>", "Player statistical category");

  addSeasonTypeOption(players);
  addClassificationOption(players);
  players
    .addHelpText(
      "after",
      "\nQuery by --id, or use --year with at least one of --week, --team, or --conference.\n\nExamples:\n  fbs games players --id 401752731\n  fbs games players --year 2026 --team \"Florida State\" --category passing\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<GamePlayerStatsQuery>>(command);
      const rawQuery = buildGamePlayerStatsQuery(options);

      await withCommandContext("games players", rawQuery, async () => {
        const query = validateGamePlayerStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "games players",
          endpoint: "/games/players",
          query: asQueryRecord(query),
          resultKey: "player_stats",
          request: (api) => api.gamePlayerStats(query),
          transform: transformPlayerGameStats,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGameWeatherCommand(games: Command, runtime: CommandRuntime): void {
  const weather = games
    .command("weather")
    .description("Retrieve historical or future game weather data")
    .option("--game-id <number>", "Game ID", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation")
    .option("--indoors <boolean>", "Local filter: game played indoors", parseBoolean)
    .option("--weather-condition <value>", "Local filter: weather condition")
    .option("--min-temperature <number>", "Local filter: minimum temperature", parseNumber)
    .option("--max-temperature <number>", "Local filter: maximum temperature", parseNumber);

  addSeasonTypeOption(weather);
  addClassificationOption(weather);
  weather
    .addHelpText(
      "after",
      "\n--year is required unless --game-id is supplied. This endpoint may require an eligible CFBD subscription tier.\n\nExamples:\n  fbs games weather --game-id 401752731\n  fbs games weather --year 2026 --team \"Florida State\" --week 1\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const {
        indoors,
        weatherCondition,
        minTemperature,
        maxTemperature,
        ...options
      } = suppliedLeafOptions<
        Partial<WeatherQuery> & {
          indoors?: boolean;
          weatherCondition?: string;
          minTemperature?: number;
          maxTemperature?: number;
        }
      >(command);
      validateOrderedRange(minTemperature, maxTemperature, "min-temperature", "max-temperature");
      const filters = localFilters({
        indoors,
        weatherCondition,
        minTemperature,
        maxTemperature,
      });
      const rawQuery = buildWeatherQuery(options);

      await withCommandContext("games weather", rawQuery, async () => {
        const query = validateWeatherQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "games weather",
          endpoint: "/games/weather",
          query: asQueryRecord(query),
          resultKey: "weather",
          request: (api) => api.weather(query),
          transform: transformWeather,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                booleanMatches(valueAt(row, "indoors"), filters?.indoors as boolean | undefined) &&
                stringMatches(
                  valueAt(row, "conditions.summary"),
                  filters?.weatherCondition as string | undefined,
                ) &&
                numberMatches(
                  valueAt(row, "conditions.temperature_f"),
                  filters?.minTemperature as number | undefined,
                  filters?.maxTemperature as number | undefined,
                ),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerGameMediaCommand(games: Command, runtime: CommandRuntime): void {
  const media = games
    .command("media")
    .description("Retrieve broadcast and streaming listings for games")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Either participating team")
    .option("--conference <value>", "Conference abbreviation")
    .addOption(
      new Option("--media-type <value>", "Media type").choices([
        "tv",
        "radio",
        "web",
        "ppv",
        "mobile",
      ]),
    );

  addSeasonTypeOption(media);
  addClassificationOption(media);
  media
    .addHelpText(
      "after",
      "\n--year is required.\n\nExamples:\n  fbs games media --year 2026\n  fbs games media --year 2026 --week 1 --team \"Florida State\" --media-type tv\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<MediaQuery>>(command);
      const rawQuery = buildMediaQuery(options);

      await withCommandContext("games media", rawQuery, async () => {
        const query = validateMediaQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "games media",
          endpoint: "/games/media",
          query: asQueryRecord(query),
          resultKey: "media",
          request: (api) => asReferenceCfbdApi(api).media(query),
          transform: transformGameMedia,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerGamesCommand(program: Command, runtime: CommandRuntime): void {
  const games = program
    .command("games")
    .description("Retrieve historical game data")
    .option("--id <number>", "Game ID", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Either participating team")
    .option("--home <name>", "Home team")
    .option("--away <name>", "Away team")
    .option("--conference <value>", "Conference abbreviation")
    .option("--completed <boolean>", "Local filter: completed games", parseBoolean)
    .option("--neutral-site <boolean>", "Local filter: neutral-site games", parseBoolean)
    .option("--conference-game <boolean>", "Local filter: conference games", parseBoolean)
    .option("--venue <value>", "Local filter: venue name");

  addSeasonTypeOption(games);
  addClassificationOption(games);
  addPlayoffOptions(games);
  games
    .addHelpText(
      "after",
      "\n--year is required unless --id is supplied. --round requires --competition cfp. Use fbs scoreboard for richer current game status.\n\nExamples:\n  fbs games --year 2026 --team \"Florida State\"\n  fbs games --id 401752731\n  fbs games --year 2026 --competition cfp --round semifinal\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const {
        completed,
        neutralSite,
        conferenceGame,
        venue,
        ...options
      } = suppliedOptions<
        Partial<GamesQuery> & {
          completed?: boolean;
          neutralSite?: boolean;
          conferenceGame?: boolean;
          venue?: string;
        }
      >(command);
      const filters = localFilters({ completed, neutralSite, conferenceGame, venue });
      const rawQuery = buildGamesQuery(options);

      await withCommandContext("games", rawQuery, async () => {
        const query = validateGamesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "games",
          endpoint: "/games",
          query: asQueryRecord(query),
          resultKey: "games",
          request: (api) => api.games(query),
          transform: transformGames,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                booleanMatches(valueAt(row, "completed"), filters?.completed as boolean | undefined) &&
                booleanMatches(valueAt(row, "neutral_site"), filters?.neutralSite as boolean | undefined) &&
                booleanMatches(
                  valueAt(row, "conference_game"),
                  filters?.conferenceGame as boolean | undefined,
                ) &&
                stringMatches(valueAt(row, "venue"), filters?.venue as string | undefined),
            ),
        });
      });
    })
    .allowExcessArguments(false);

  registerGameTeamsCommand(games, runtime);
  registerGamePlayersCommand(games, runtime);
  registerGameWeatherCommand(games, runtime);
  registerGameMediaCommand(games, runtime);
}

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
import {
  filterRows,
  localFilters,
  numberMatches,
  parseNonNegativeInteger,
  parseNumber,
  stringMatches,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
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
  )
    .option("--min-epa <number>", "Local filter: minimum total EPA (inclusive)", parseNumber)
    .option("--max-epa <number>", "Local filter: maximum total EPA (inclusive)", parseNumber)
    .option("--min-epa-allowed <number>", "Local filter: minimum total EPA allowed (inclusive)", parseNumber)
    .option("--max-epa-allowed <number>", "Local filter: maximum total EPA allowed (inclusive)", parseNumber);
  season
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa team season --year 2025\n  fbs wepa team season --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minEpa, maxEpa, minEpaAllowed, maxEpaAllowed, ...options } = suppliedOptions<
        Partial<WepaTeamSeasonQuery> & {
          minEpa?: number;
          maxEpa?: number;
          minEpaAllowed?: number;
          maxEpaAllowed?: number;
        }
      >(command);
      const filters = localFilters({ minEpa, maxEpa, minEpaAllowed, maxEpaAllowed });
      const rawQuery = buildWepaTeamSeasonQuery(options);
      await withCommandContext("wepa team season", rawQuery, async () => {
        validateOrderedRange(minEpa, maxEpa, "min-epa", "max-epa");
        validateOrderedRange(minEpaAllowed, maxEpaAllowed, "min-epa-allowed", "max-epa-allowed");
        const query = validateWepaTeamSeasonQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa team season",
          endpoint: "/wepa/team/season",
          query: asQueryRecord(query),
          resultKey: "team_metrics",
          request: (api) => asAnalyticsApi(api).wepaTeamSeason(query),
          transform: transformWepaTeamSeason,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                numberMatches(valueAt(row, "epa.total"), minEpa, maxEpa) &&
                numberMatches(valueAt(row, "epa_allowed.total"), minEpaAllowed, maxEpaAllowed),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPassing(players: Command, runtime: CommandRuntime): void {
  const passing = addTeamSeasonFilters(
    players.command("passing").description("Retrieve opponent-adjusted passing metrics"),
  )
    .option("--position <value>", "Position abbreviation")
    .option("--player <name>", "Local filter: player")
    .option("--min-plays <number>", "Local filter: minimum plays", parseNonNegativeInteger)
    .option("--min-wepa <number>", "Local filter: minimum weighted EPA (inclusive)", parseNumber)
    .option("--max-wepa <number>", "Local filter: maximum weighted EPA (inclusive)", parseNumber);
  passing
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players passing --year 2025\n  fbs wepa players passing --team \"Florida State\" --position QB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { player, minPlays, minWepa, maxWepa, ...options } = suppliedOptions<
        Partial<WepaPassingQuery> & { player?: string; minPlays?: number; minWepa?: number; maxWepa?: number }
      >(command);
      const filters = localFilters({ player, minPlays, minWepa, maxWepa });
      const rawQuery = buildWepaPassingQuery(options);
      await withCommandContext("wepa players passing", rawQuery, async () => {
        validateOrderedRange(minWepa, maxWepa, "min-wepa", "max-wepa");
        const query = validateWepaPassingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players passing",
          endpoint: "/wepa/players/passing",
          query: asQueryRecord(query),
          resultKey: "player_metrics",
          request: (api) => asAnalyticsApi(api).wepaPassing(query),
          transform: transformWepaPassing,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(valueAt(row, "athlete_name", "player"), filters?.player as string | undefined) &&
                numberMatches(valueAt(row, "plays"), minPlays, undefined) &&
                numberMatches(valueAt(row, "wepa"), minWepa, maxWepa),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerRushing(players: Command, runtime: CommandRuntime): void {
  const rushing = addTeamSeasonFilters(
    players.command("rushing").description("Retrieve opponent-adjusted rushing metrics"),
  )
    .option("--position <value>", "Position abbreviation")
    .option("--player <name>", "Local filter: player")
    .option("--min-plays <number>", "Local filter: minimum plays", parseNonNegativeInteger)
    .option("--min-wepa <number>", "Local filter: minimum weighted EPA (inclusive)", parseNumber)
    .option("--max-wepa <number>", "Local filter: maximum weighted EPA (inclusive)", parseNumber);
  rushing
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players rushing --year 2025\n  fbs wepa players rushing --team \"Florida State\" --position RB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { player, minPlays, minWepa, maxWepa, ...options } = suppliedOptions<
        Partial<WepaRushingQuery> & { player?: string; minPlays?: number; minWepa?: number; maxWepa?: number }
      >(command);
      const filters = localFilters({ player, minPlays, minWepa, maxWepa });
      const rawQuery = buildWepaRushingQuery(options);
      await withCommandContext("wepa players rushing", rawQuery, async () => {
        validateOrderedRange(minWepa, maxWepa, "min-wepa", "max-wepa");
        const query = validateWepaRushingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players rushing",
          endpoint: "/wepa/players/rushing",
          query: asQueryRecord(query),
          resultKey: "player_metrics",
          request: (api) => asAnalyticsApi(api).wepaRushing(query),
          transform: transformWepaRushing,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(valueAt(row, "athlete_name", "player"), filters?.player as string | undefined) &&
                numberMatches(valueAt(row, "plays"), minPlays, undefined) &&
                numberMatches(valueAt(row, "wepa"), minWepa, maxWepa),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerKicking(players: Command, runtime: CommandRuntime): void {
  const kicking = addTeamSeasonFilters(
    players.command("kicking").description("Retrieve kicker PAAR ratings"),
  )
    .option("--player <name>", "Local filter: player")
    .option("--min-attempts <number>", "Local filter: minimum attempts", parseNonNegativeInteger)
    .option("--min-paar <number>", "Local filter: minimum PAAR (inclusive)", parseNumber)
    .option("--max-paar <number>", "Local filter: maximum PAAR (inclusive)", parseNumber);
  kicking
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs wepa players kicking --year 2025\n  fbs wepa players kicking --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { player, minAttempts, minPaar, maxPaar, ...options } = suppliedOptions<
        Partial<WepaKickingQuery> & { player?: string; minAttempts?: number; minPaar?: number; maxPaar?: number }
      >(command);
      const filters = localFilters({ player, minAttempts, minPaar, maxPaar });
      const rawQuery = buildWepaKickingQuery(options);
      await withCommandContext("wepa players kicking", rawQuery, async () => {
        validateOrderedRange(minPaar, maxPaar, "min-paar", "max-paar");
        const query = validateWepaKickingQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "wepa players kicking",
          endpoint: "/wepa/players/kicking",
          query: asQueryRecord(query),
          resultKey: "kicker_ratings",
          request: (api) => asAnalyticsApi(api).wepaKicking(query),
          transform: transformWepaKicking,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                stringMatches(valueAt(row, "player", "athlete_name"), filters?.player as string | undefined) &&
                numberMatches(valueAt(row, "attempts"), minAttempts, undefined) &&
                numberMatches(valueAt(row, "paar"), minPaar, maxPaar),
            ),
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

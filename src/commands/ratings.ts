import type { Command } from "commander";

import {
  buildConferenceSpRatingsQuery,
  buildEloRatingsQuery,
  buildExpandedSrsRatingsQuery,
  buildFpiRatingsQuery,
  buildSpRatingsQuery,
  buildSrsRatingsQuery,
  type ConferenceSpRatingsQuery,
  type EloRatingsQuery,
  type ExpandedSrsRatingsQuery,
  type FpiRatingsQuery,
  type SpRatingsQuery,
  type SrsRatingsQuery,
  validateConferenceSpRatingsQuery,
  validateEloRatingsQuery,
  validateExpandedSrsRatingsQuery,
  validateFpiRatingsQuery,
  validateSpRatingsQuery,
  validateSrsRatingsQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformConferenceSpRatings,
  transformEloRatings,
  transformExpandedSrsRatings,
  transformFpiRatings,
  transformSpRatings,
  transformSrsRatings,
} from "../transformers/analytics-ratings";
import { asAnalyticsApi } from "./analytics-shared";
import {
  filterRows,
  localFilters,
  numberMatches,
  parseNumber,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function sameTeamName(providerTeam: string, requestedTeam: string | undefined): boolean {
  return (
    requestedTeam !== undefined &&
    providerTeam.localeCompare(requestedTeam, "en-US", { sensitivity: "base" }) === 0
  );
}

function registerConferenceSp(sp: Command, runtime: CommandRuntime): void {
  const conferences = sp
    .command("conferences")
    .description("Retrieve historical conference SP+ ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-rating <number>", "Local filter: minimum conference SP+ rating (inclusive)", parseNumber)
    .option("--max-rating <number>", "Local filter: maximum conference SP+ rating (inclusive)", parseNumber);
  addClassificationOption(conferences);
  conferences
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs ratings sp conferences --year 2025\n  fbs ratings sp conferences --conference ACC --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minRating, maxRating, ...options } = suppliedLeafOptions<
        Partial<ConferenceSpRatingsQuery> & { minRating?: number; maxRating?: number }
      >(command);
      const filters = localFilters({ minRating, maxRating });
      const rawQuery = buildConferenceSpRatingsQuery(options);
      await withCommandContext("ratings sp conferences", rawQuery, async () => {
        validateOrderedRange(minRating, maxRating, "min-rating", "max-rating");
        const query = validateConferenceSpRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings sp conferences",
          endpoint: "/ratings/sp/conferences",
          query: asQueryRecord(query),
          resultKey: "conference_sp_ratings",
          request: (api) => asAnalyticsApi(api).conferenceSpRatings(query),
          transform: transformConferenceSpRatings,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) => numberMatches(row.rating, minRating, maxRating)),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerSp(ratings: Command, runtime: CommandRuntime): void {
  const sp = ratings
    .command("sp")
    .description("Retrieve SP+ ratings")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-rating <number>", "Local filter: minimum SP+ rating (inclusive)", parseNumber)
    .option("--max-rating <number>", "Local filter: maximum SP+ rating (inclusive)", parseNumber);
  sp
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required. When both are supplied, fbs filters the full-year response locally so provider ranking fields remain national.\n\nExamples:\n  fbs ratings sp --year 2025\n  fbs ratings sp --year 2025 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minRating, maxRating, ...options } = suppliedOptions<
        Partial<SpRatingsQuery> & { minRating?: number; maxRating?: number }
      >(command);
      const filters = localFilters({ minRating, maxRating });
      const rawQuery = buildSpRatingsQuery(options);
      await withCommandContext("ratings sp", rawQuery, async () => {
        validateOrderedRange(minRating, maxRating, "min-rating", "max-rating");
        const query = validateSpRatingsQuery(rawQuery);
        const preserveNationalRanks = query.year !== undefined && query.team !== undefined;
        const requestQuery: SpRatingsQuery =
          query.year !== undefined && query.team !== undefined
            ? { year: query.year }
            : query;
        await runEndpoint(runtime, {
          command: "ratings sp",
          endpoint: "/ratings/sp",
          query: asQueryRecord(query),
          resultKey: "sp_ratings",
          request: (api) => asAnalyticsApi(api).spRatings(requestQuery),
          transform: (response) =>
            transformSpRatings(
              preserveNationalRanks
                ? response.filter(
                    (rating) => sameTeamName(rating.team, query.team),
                  )
                : response,
            ),
          count: (_response, output) => output.length,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) => numberMatches(row.rating, minRating, maxRating)),
        });
      });
    })
    .allowExcessArguments(false);
  registerConferenceSp(sp, runtime);
}

function registerExpandedSrs(srs: Command, runtime: CommandRuntime): void {
  const expanded = srs
    .command("expanded")
    .description("Retrieve expanded SRS ratings, including FCS")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-rating <number>", "Local filter: minimum SRS rating (inclusive)", parseNumber)
    .option("--max-rating <number>", "Local filter: maximum SRS rating (inclusive)", parseNumber);
  addClassificationOption(expanded);
  expanded
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings srs expanded --year 2025\n  fbs ratings srs expanded --team \"Florida State\" --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minRating, maxRating, ...options } = suppliedLeafOptions<
        Partial<ExpandedSrsRatingsQuery> & { minRating?: number; maxRating?: number }
      >(command);
      const filters = localFilters({ minRating, maxRating });
      const rawQuery = buildExpandedSrsRatingsQuery(options);
      await withCommandContext("ratings srs expanded", rawQuery, async () => {
        validateOrderedRange(minRating, maxRating, "min-rating", "max-rating");
        const query = validateExpandedSrsRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings srs expanded",
          endpoint: "/ratings/srs/expanded",
          query: asQueryRecord(query),
          resultKey: "expanded_srs_ratings",
          request: (api) => asAnalyticsApi(api).expandedSrsRatings(query),
          transform: transformExpandedSrsRatings,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) => numberMatches(row.rating, minRating, maxRating)),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerSrs(ratings: Command, runtime: CommandRuntime): void {
  const srs = ratings
    .command("srs")
    .description("Retrieve Simple Rating System ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-rating <number>", "Local filter: minimum SRS rating (inclusive)", parseNumber)
    .option("--max-rating <number>", "Local filter: maximum SRS rating (inclusive)", parseNumber);
  srs
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings srs --year 2025\n  fbs ratings srs --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minRating, maxRating, ...options } = suppliedOptions<
        Partial<SrsRatingsQuery> & { minRating?: number; maxRating?: number }
      >(command);
      const filters = localFilters({ minRating, maxRating });
      const rawQuery = buildSrsRatingsQuery(options);
      await withCommandContext("ratings srs", rawQuery, async () => {
        validateOrderedRange(minRating, maxRating, "min-rating", "max-rating");
        const query = validateSrsRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings srs",
          endpoint: "/ratings/srs",
          query: asQueryRecord(query),
          resultKey: "srs_ratings",
          request: (api) => asAnalyticsApi(api).srsRatings(query),
          transform: transformSrsRatings,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) => numberMatches(row.rating, minRating, maxRating)),
        });
      });
    })
    .allowExcessArguments(false);
  registerExpandedSrs(srs, runtime);
}

function registerElo(ratings: Command, runtime: CommandRuntime): void {
  const elo = ratings
    .command("elo")
    .description("Retrieve historical Elo ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-elo <number>", "Local filter: minimum Elo (inclusive)", parseNumber)
    .option("--max-elo <number>", "Local filter: maximum Elo (inclusive)", parseNumber);
  addSeasonTypeOption(elo);
  elo
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs ratings elo --year 2025\n  fbs ratings elo --team \"Florida State\" --week 1\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minElo, maxElo, ...options } = suppliedOptions<
        Partial<EloRatingsQuery> & { minElo?: number; maxElo?: number }
      >(command);
      const filters = localFilters({ minElo, maxElo });
      const rawQuery = buildEloRatingsQuery(options);
      await withCommandContext("ratings elo", rawQuery, async () => {
        validateOrderedRange(minElo, maxElo, "min-elo", "max-elo");
        const query = validateEloRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings elo",
          endpoint: "/ratings/elo",
          query: asQueryRecord(query),
          resultKey: "elo_ratings",
          request: (api) => asAnalyticsApi(api).eloRatings(query),
          transform: transformEloRatings,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(rows, (row) => numberMatches(valueAt(row, "elo"), minElo, maxElo)),
        });
      });
    })
    .allowExcessArguments(false);
}

function registerFpi(ratings: Command, runtime: CommandRuntime): void {
  const fpi = ratings
    .command("fpi")
    .description("Retrieve Football Power Index ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger)
    .option("--min-fpi <number>", "Local filter: minimum FPI (inclusive)", parseNumber)
    .option("--max-fpi <number>", "Local filter: maximum FPI (inclusive)", parseNumber);
  fpi
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings fpi --year 2025\n  fbs ratings fpi --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { minFpi, maxFpi, ...options } = suppliedOptions<
        Partial<FpiRatingsQuery> & { minFpi?: number; maxFpi?: number }
      >(command);
      const filters = localFilters({ minFpi, maxFpi });
      const rawQuery = buildFpiRatingsQuery(options);
      await withCommandContext("ratings fpi", rawQuery, async () => {
        validateOrderedRange(minFpi, maxFpi, "min-fpi", "max-fpi");
        const query = validateFpiRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings fpi",
          endpoint: "/ratings/fpi",
          query: asQueryRecord(query),
          resultKey: "fpi_ratings",
          request: (api) => asAnalyticsApi(api).fpiRatings(query),
          transform: transformFpiRatings,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) => filterRows(rows, (row) => numberMatches(row.fpi, minFpi, maxFpi)),
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerRatingsCommand(program: Command, runtime: CommandRuntime): void {
  const ratings = program.command("ratings").description("Retrieve historical ratings");
  ratings.action((_options: unknown, command: Command) => command.outputHelp());
  registerSp(ratings, runtime);
  registerSrs(ratings, runtime);
  registerElo(ratings, runtime);
  registerFpi(ratings, runtime);
}

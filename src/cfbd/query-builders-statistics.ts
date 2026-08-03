import type {
  GetGameHavocStatsData,
  GetPlayerGameSuccessRatesData,
  GetPlayerSeasonOverviewData,
  GetPlayerSeasonStatsData,
  GetPlayerSeasonSuccessRatesData,
  GetPredictedPointsAddedByGameData,
  GetPredictedPointsAddedByPlayerGameData,
  GetPredictedPointsAddedByPlayerSeasonData,
  GetPredictedPointsAddedByTeamData,
  GetPredictedPointsData,
  GetPregameWinProbabilitiesData,
  GetReturningProductionData,
  GetTeamStatsData,
  GetTransferPortalData,
  GetWinProbabilityData,
  SearchPlayersData,
} from "cfbd";
import { z } from "zod";

import { fromZodError, QueryValidationError } from "../errors";
import { removeUndefined } from "../utils/remove-nullish";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;
type InputOf<T> = { [K in keyof T]?: T[K] };

export type PlayerSeasonStatsQuery = QueryOf<GetPlayerSeasonStatsData>;
export type PlayerSeasonSuccessQuery = QueryOf<GetPlayerSeasonSuccessRatesData>;
export type PlayerGameSuccessQuery = QueryOf<GetPlayerGameSuccessRatesData>;
export type TeamSeasonStatsQuery = QueryOf<GetTeamStatsData>;
export type GameHavocStatsQuery = QueryOf<GetGameHavocStatsData>;
export type PlayerSearchQuery = QueryOf<SearchPlayersData>;
export type PlayerSeasonOverviewQuery = QueryOf<GetPlayerSeasonOverviewData>;
export type ReturningProductionQuery = QueryOf<GetReturningProductionData>;
export type TransferPortalQuery = QueryOf<GetTransferPortalData>;
export type PredictedPointsQuery = QueryOf<GetPredictedPointsData>;
export type TeamPpaQuery = QueryOf<GetPredictedPointsAddedByTeamData>;
export type GamePpaQuery = QueryOf<GetPredictedPointsAddedByGameData>;
export type PlayerGamePpaQuery = QueryOf<GetPredictedPointsAddedByPlayerGameData>;
export type PlayerSeasonPpaQuery = QueryOf<GetPredictedPointsAddedByPlayerSeasonData>;
export type WinProbabilityQuery = QueryOf<GetWinProbabilityData>;
export type PregameWinProbabilitiesQuery = QueryOf<GetPregameWinProbabilitiesData>;

const positiveInteger = z.number().int().positive();
const nonNegativeInteger = z.number().int().nonnegative();
const nonNegativeNumber = z.number().nonnegative();
const nonEmptyString = z.string().trim().min(1, "must not be blank");
const classification = z.enum(["fbs", "fcs", "ii", "iii"]);
const seasonType = z.enum([
  "regular",
  "postseason",
  "both",
  "allstar",
  "spring_regular",
  "spring_postseason",
]);

const playerSeasonStatsSchema = z.object({
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  startWeek: nonNegativeInteger.optional(),
  endWeek: nonNegativeInteger.optional(),
  seasonType: seasonType.optional(),
  category: nonEmptyString.optional(),
});

const playerSeasonSuccessSchema = z.object({
  year: positiveInteger.optional(),
  playerId: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  startWeek: nonNegativeInteger.optional(),
  endWeek: nonNegativeInteger.optional(),
  seasonType: seasonType.optional(),
  threshold: nonNegativeInteger.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const playerGameSuccessSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  playerId: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  seasonType: seasonType.optional(),
  threshold: nonNegativeInteger.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const teamSeasonStatsSchema = z.object({
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  startWeek: nonNegativeInteger.optional(),
  endWeek: nonNegativeInteger.optional(),
  classification: classification.optional(),
});

const gameHavocStatsSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: nonEmptyString.optional(),
  opponent: nonEmptyString.optional(),
  seasonType: seasonType.optional(),
});

const playerSearchSchema = z.object({
  searchTerm: nonEmptyString.optional(),
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  position: nonEmptyString.optional(),
});

const playerSeasonOverviewSchema = z.object({
  year: positiveInteger.optional(),
  playerId: positiveInteger.optional(),
});

const returningProductionSchema = z.object({
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
});

const transferPortalSchema = z.object({ year: positiveInteger.optional() });

const predictedPointsSchema = z.object({
  down: positiveInteger.max(4).optional(),
  distance: nonNegativeInteger.optional(),
});

const teamPpaSchema = z.object({
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  classification: classification.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const gamePpaSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  seasonType: seasonType.optional(),
  classification: classification.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const playerGamePpaSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: nonEmptyString.optional(),
  position: nonEmptyString.optional(),
  playerId: nonEmptyString.optional(),
  threshold: nonNegativeNumber.optional(),
  seasonType: seasonType.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const playerSeasonPpaSchema = z.object({
  year: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  position: nonEmptyString.optional(),
  playerId: nonEmptyString.optional(),
  threshold: nonNegativeNumber.optional(),
  excludeGarbageTime: z.boolean().optional(),
});

const winProbabilitySchema = z.object({ gameId: positiveInteger.optional() });

const pregameWinProbabilitiesSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: nonEmptyString.optional(),
  seasonType: seasonType.optional(),
});

type WithoutUndefined<T extends Record<string, unknown>> = {
  [K in keyof T]?: Exclude<T[K], undefined>;
};

function compact<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return removeUndefined(value) as WithoutUndefined<T>;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw fromZodError(result.error);
  return result.data;
}

function requireYear(value: { year?: number | undefined }): void {
  if (value.year === undefined) {
    throw new QueryValidationError("year is required", "Supply --year.");
  }
}

function requireYearOrTeam(value: {
  year?: number | undefined;
  team?: string | undefined;
}): void {
  if (value.year === undefined && value.team === undefined) {
    throw new QueryValidationError(
      "year or team is required",
      "Supply --year or --team.",
    );
  }
}

function requireOrderedWeeks(value: {
  startWeek?: number | undefined;
  endWeek?: number | undefined;
}): void {
  if (
    value.startWeek !== undefined &&
    value.endWeek !== undefined &&
    value.startWeek > value.endWeek
  ) {
    throw new QueryValidationError(
      "startWeek must be less than or equal to endWeek",
      "Use an --end-week value greater than or equal to --start-week.",
    );
  }
}

export function buildPlayerSeasonStatsQuery(
  options: InputOf<PlayerSeasonStatsQuery>,
): PlayerSeasonStatsQuery {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
    startWeek: options.startWeek,
    endWeek: options.endWeek,
    seasonType: options.seasonType,
    category: options.category,
  }) as PlayerSeasonStatsQuery;
}

export function validatePlayerSeasonStatsQuery(
  query: InputOf<PlayerSeasonStatsQuery>,
): PlayerSeasonStatsQuery {
  const valid = parse(playerSeasonStatsSchema, query);
  requireYear(valid);
  requireOrderedWeeks(valid);
  return valid as PlayerSeasonStatsQuery;
}

export function buildPlayerSeasonSuccessQuery(
  options: InputOf<PlayerSeasonSuccessQuery>,
): PlayerSeasonSuccessQuery {
  return compact({
    year: options.year,
    playerId: options.playerId,
    team: options.team,
    conference: options.conference,
    startWeek: options.startWeek,
    endWeek: options.endWeek,
    seasonType: options.seasonType,
    threshold: options.threshold,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as PlayerSeasonSuccessQuery;
}

export function validatePlayerSeasonSuccessQuery(
  query: InputOf<PlayerSeasonSuccessQuery>,
): PlayerSeasonSuccessQuery {
  const valid = parse(playerSeasonSuccessSchema, query);
  if (valid.year === undefined && valid.playerId === undefined) {
    throw new QueryValidationError(
      "year or playerId is required",
      "Supply --year or --player-id.",
    );
  }
  requireOrderedWeeks(valid);
  return valid as PlayerSeasonSuccessQuery;
}

export function buildPlayerGameSuccessQuery(
  options: InputOf<PlayerGameSuccessQuery>,
): PlayerGameSuccessQuery {
  return compact({
    year: options.year,
    week: options.week,
    playerId: options.playerId,
    team: options.team,
    conference: options.conference,
    seasonType: options.seasonType,
    threshold: options.threshold,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as PlayerGameSuccessQuery;
}

export function validatePlayerGameSuccessQuery(
  query: InputOf<PlayerGameSuccessQuery>,
): PlayerGameSuccessQuery {
  const valid = parse(playerGameSuccessSchema, query);
  requireYear(valid);
  if (
    valid.week === undefined &&
    valid.team === undefined &&
    valid.playerId === undefined
  ) {
    throw new QueryValidationError(
      "week, team, or playerId is required",
      "Supply --week, --team, or --player-id with --year.",
    );
  }
  return valid as PlayerGameSuccessQuery;
}

export function buildTeamSeasonStatsQuery(
  options: InputOf<TeamSeasonStatsQuery>,
): TeamSeasonStatsQuery {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
    startWeek: options.startWeek,
    endWeek: options.endWeek,
    classification: options.classification,
  }) as TeamSeasonStatsQuery;
}

export function validateTeamSeasonStatsQuery(
  query: InputOf<TeamSeasonStatsQuery>,
): TeamSeasonStatsQuery {
  const valid = parse(teamSeasonStatsSchema, query);
  requireYearOrTeam(valid);
  requireOrderedWeeks(valid);
  return valid as TeamSeasonStatsQuery;
}

export function buildGameHavocStatsQuery(
  options: InputOf<GameHavocStatsQuery>,
): GameHavocStatsQuery {
  return compact({
    year: options.year,
    week: options.week,
    team: options.team,
    opponent: options.opponent,
    seasonType: options.seasonType,
  }) as GameHavocStatsQuery;
}

export function validateGameHavocStatsQuery(
  query: InputOf<GameHavocStatsQuery>,
): GameHavocStatsQuery {
  const valid = parse(gameHavocStatsSchema, query);
  requireYearOrTeam(valid);
  return valid as GameHavocStatsQuery;
}

export function buildPlayerSearchQuery(
  options: InputOf<PlayerSearchQuery>,
): PlayerSearchQuery {
  return compact({
    searchTerm: options.searchTerm,
    year: options.year,
    team: options.team,
    position: options.position,
  }) as PlayerSearchQuery;
}

export function validatePlayerSearchQuery(
  query: InputOf<PlayerSearchQuery>,
): PlayerSearchQuery {
  const valid = parse(playerSearchSchema, query);
  if (valid.searchTerm === undefined) {
    throw new QueryValidationError(
      "searchTerm is required",
      "Supply --search-term with a player name.",
    );
  }
  return valid as PlayerSearchQuery;
}

export function buildPlayerSeasonOverviewQuery(
  options: InputOf<PlayerSeasonOverviewQuery>,
): PlayerSeasonOverviewQuery {
  return compact({ year: options.year, playerId: options.playerId }) as PlayerSeasonOverviewQuery;
}

export function validatePlayerSeasonOverviewQuery(
  query: InputOf<PlayerSeasonOverviewQuery>,
): PlayerSeasonOverviewQuery {
  const valid = parse(playerSeasonOverviewSchema, query);
  if (valid.year === undefined || valid.playerId === undefined) {
    throw new QueryValidationError(
      "year and playerId are required",
      "Supply both --year and --player-id.",
    );
  }
  return valid as PlayerSeasonOverviewQuery;
}

export function buildReturningProductionQuery(
  options: InputOf<ReturningProductionQuery>,
): ReturningProductionQuery {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
  }) as ReturningProductionQuery;
}

export function validateReturningProductionQuery(
  query: InputOf<ReturningProductionQuery>,
): ReturningProductionQuery {
  const valid = parse(returningProductionSchema, query);
  requireYearOrTeam(valid);
  return valid as ReturningProductionQuery;
}

export function buildTransferPortalQuery(
  options: InputOf<TransferPortalQuery>,
): TransferPortalQuery {
  return compact({ year: options.year }) as TransferPortalQuery;
}

export function validateTransferPortalQuery(
  query: InputOf<TransferPortalQuery>,
): TransferPortalQuery {
  const valid = parse(transferPortalSchema, query);
  requireYear(valid);
  return valid as TransferPortalQuery;
}

export function buildPredictedPointsQuery(
  options: InputOf<PredictedPointsQuery>,
): PredictedPointsQuery {
  return compact({ down: options.down, distance: options.distance }) as PredictedPointsQuery;
}

export function validatePredictedPointsQuery(
  query: InputOf<PredictedPointsQuery>,
): PredictedPointsQuery {
  const valid = parse(predictedPointsSchema, query);
  if (valid.down === undefined || valid.distance === undefined) {
    throw new QueryValidationError(
      "down and distance are required",
      "Supply both --down and --distance.",
    );
  }
  return valid as PredictedPointsQuery;
}

export function buildTeamPpaQuery(options: InputOf<TeamPpaQuery>): TeamPpaQuery {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
    classification: options.classification,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as TeamPpaQuery;
}

export function validateTeamPpaQuery(query: InputOf<TeamPpaQuery>): TeamPpaQuery {
  const valid = parse(teamPpaSchema, query);
  requireYearOrTeam(valid);
  return valid as TeamPpaQuery;
}

export function buildGamePpaQuery(options: InputOf<GamePpaQuery>): GamePpaQuery {
  return compact({
    year: options.year,
    week: options.week,
    team: options.team,
    conference: options.conference,
    seasonType: options.seasonType,
    classification: options.classification,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as GamePpaQuery;
}

export function validateGamePpaQuery(query: InputOf<GamePpaQuery>): GamePpaQuery {
  const valid = parse(gamePpaSchema, query);
  requireYear(valid);
  return valid as GamePpaQuery;
}

export function buildPlayerGamePpaQuery(
  options: InputOf<PlayerGamePpaQuery>,
): PlayerGamePpaQuery {
  return compact({
    year: options.year,
    week: options.week,
    team: options.team,
    position: options.position,
    playerId: options.playerId,
    threshold: options.threshold,
    seasonType: options.seasonType,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as PlayerGamePpaQuery;
}

export function validatePlayerGamePpaQuery(
  query: InputOf<PlayerGamePpaQuery>,
): PlayerGamePpaQuery {
  const valid = parse(playerGamePpaSchema, query);
  requireYear(valid);
  if (valid.week === undefined && valid.team === undefined) {
    throw new QueryValidationError(
      "week or team is required",
      "Supply --week or --team with --year.",
    );
  }
  return valid as PlayerGamePpaQuery;
}

export function buildPlayerSeasonPpaQuery(
  options: InputOf<PlayerSeasonPpaQuery>,
): PlayerSeasonPpaQuery {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
    position: options.position,
    playerId: options.playerId,
    threshold: options.threshold,
    excludeGarbageTime: options.excludeGarbageTime,
  }) as PlayerSeasonPpaQuery;
}

export function validatePlayerSeasonPpaQuery(
  query: InputOf<PlayerSeasonPpaQuery>,
): PlayerSeasonPpaQuery {
  const valid = parse(playerSeasonPpaSchema, query);
  if (valid.year === undefined && valid.playerId === undefined) {
    throw new QueryValidationError(
      "year or playerId is required",
      "Supply --year or --player-id.",
    );
  }
  return valid as PlayerSeasonPpaQuery;
}

export function buildWinProbabilityQuery(
  options: InputOf<WinProbabilityQuery>,
): WinProbabilityQuery {
  return compact({ gameId: options.gameId }) as WinProbabilityQuery;
}

export function validateWinProbabilityQuery(
  query: InputOf<WinProbabilityQuery>,
): WinProbabilityQuery {
  const valid = parse(winProbabilitySchema, query);
  if (valid.gameId === undefined) {
    throw new QueryValidationError("gameId is required", "Supply --game-id.");
  }
  return valid as WinProbabilityQuery;
}

export function buildPregameWinProbabilitiesQuery(
  options: InputOf<PregameWinProbabilitiesQuery>,
): PregameWinProbabilitiesQuery {
  return compact({
    year: options.year,
    week: options.week,
    team: options.team,
    seasonType: options.seasonType,
  }) as PregameWinProbabilitiesQuery;
}

export function validatePregameWinProbabilitiesQuery(
  query: InputOf<PregameWinProbabilitiesQuery>,
): PregameWinProbabilitiesQuery {
  return parse(pregameWinProbabilitiesSchema, query) as PregameWinProbabilitiesQuery;
}

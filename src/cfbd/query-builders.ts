import type {
  GetAdvancedGameStatsData,
  GetAdvancedSeasonStatsData,
  GetDrivesData,
  GetFbsTeamsData,
  GetGamePlayerStatsData,
  GetGamesData,
  GetGameTeamStatsData,
  GetPlayStatsData,
  GetPlayerUsageData,
  GetPlaysData,
  GetRosterData,
  GetUsageData,
  GetWeatherData,
} from "cfbd";
import { z } from "zod";

import { fromZodError, QueryValidationError } from "../errors";
import { removeUndefined } from "../utils/remove-nullish";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;
type InputOf<T> = { [K in keyof T]?: T[K] };

export type FbsTeamsQuery = QueryOf<GetFbsTeamsData>;
export type GamesQuery = QueryOf<GetGamesData>;
export type RosterQuery = QueryOf<GetRosterData>;
export type UsageQuery = QueryOf<GetUsageData>;
export type GameTeamStatsQuery = QueryOf<GetGameTeamStatsData>;
export type GamePlayerStatsQuery = QueryOf<GetGamePlayerStatsData>;
export type DrivesQuery = QueryOf<GetDrivesData>;
export type PlaysQuery = QueryOf<GetPlaysData>;
export type PlayStatsQuery = QueryOf<GetPlayStatsData>;
export type AdvancedGameStatsQuery = QueryOf<GetAdvancedGameStatsData>;
export type PlayerUsageQuery = QueryOf<GetPlayerUsageData>;
export type AdvancedSeasonStatsQuery = QueryOf<GetAdvancedSeasonStatsData>;
export type WeatherQuery = QueryOf<GetWeatherData>;

const positiveInteger = z.number().int().positive();
const nonNegativeInteger = z.number().int().nonnegative();
const classification = z.enum(["fbs", "fcs", "ii", "iii"]);
const seasonType = z.enum([
  "regular",
  "postseason",
  "both",
  "allstar",
  "spring_regular",
  "spring_postseason",
]);
const competition = z.literal("cfp");
const playoffRound = z.enum(["first_round", "quarterfinal", "semifinal", "championship"]);

const fbsTeamsSchema = z.object({ year: positiveInteger.optional() });
const gamesSchema = z.object({
  id: positiveInteger.optional(),
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  seasonType: seasonType.optional(),
  team: z.string().min(1).optional(),
  home: z.string().min(1).optional(),
  away: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  classification: classification.optional(),
  competition: competition.optional(),
  round: playoffRound.optional(),
});
const rosterSchema = z.object({
  year: positiveInteger.optional(),
  team: z.string().min(1).optional(),
  classification: classification.optional(),
});
const usageSchema = z.object({
  api: z.enum(["all", "cfb", "cbb"]).optional(),
  days: positiveInteger.max(31).optional(),
  limit: positiveInteger.max(50).optional(),
});
const gameTeamStatsSchema = z.object({
  id: positiveInteger.optional(),
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  seasonType: seasonType.optional(),
  classification: classification.optional(),
});
const gamePlayerStatsSchema = gameTeamStatsSchema.extend({
  category: z.string().min(1).optional(),
});
const drivesSchema = z.object({
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  seasonType: seasonType.optional(),
  team: z.string().min(1).optional(),
  offense: z.string().min(1).optional(),
  defense: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  offenseConference: z.string().min(1).optional(),
  defenseConference: z.string().min(1).optional(),
  classification: classification.optional(),
});
const playsSchema = drivesSchema.extend({
  playType: z.string().min(1).optional(),
});
const playStatsSchema = z.object({
  gameId: positiveInteger.optional(),
  athleteId: positiveInteger.optional(),
  statTypeId: positiveInteger.optional(),
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  seasonType: seasonType.optional(),
});
const advancedGameStatsSchema = z.object({
  year: positiveInteger.optional(),
  team: z.string().min(1).optional(),
  week: nonNegativeInteger.optional(),
  opponent: z.string().min(1).optional(),
  seasonType: seasonType.optional(),
  excludeGarbageTime: z.boolean().optional(),
});
const playerUsageSchema = z.object({
  year: positiveInteger.optional(),
  team: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  playerId: positiveInteger.optional(),
  position: z.string().min(1).optional(),
  excludeGarbageTime: z.boolean().optional(),
});
const advancedSeasonStatsSchema = z.object({
  year: positiveInteger.optional(),
  team: z.string().min(1).optional(),
  startWeek: nonNegativeInteger.optional(),
  endWeek: nonNegativeInteger.optional(),
  classification: classification.optional(),
  excludeGarbageTime: z.boolean().optional(),
});
const weatherSchema = z.object({
  gameId: positiveInteger.optional(),
  year: positiveInteger.optional(),
  week: nonNegativeInteger.optional(),
  team: z.string().min(1).optional(),
  conference: z.string().min(1).optional(),
  seasonType: seasonType.optional(),
  classification: classification.optional(),
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

export function buildFbsTeamsQuery(options: InputOf<FbsTeamsQuery>): FbsTeamsQuery {
  return compact({ year: options.year });
}

export function validateFbsTeamsQuery(query: InputOf<FbsTeamsQuery>): FbsTeamsQuery {
  return parse(fbsTeamsSchema, query) as FbsTeamsQuery;
}

export function buildGamesQuery(options: InputOf<GamesQuery>): GamesQuery {
  return compact({
    id: options.id,
    year: options.year,
    week: options.week,
    seasonType: options.seasonType,
    team: options.team,
    home: options.home,
    away: options.away,
    conference: options.conference,
    classification: options.classification,
    competition: options.competition,
    round: options.round,
  });
}

export function validateGamesQuery(query: GamesQuery): GamesQuery {
  const valid = parse(gamesSchema, query) as GamesQuery;
  if (valid.id === undefined && valid.year === undefined) {
    throw new QueryValidationError(
      "year is required when id is not specified",
      "Supply --year or query a game with --id.",
    );
  }
  if (valid.round !== undefined && valid.competition === undefined) {
    throw new QueryValidationError(
      "competition is required when round is specified",
      "Supply --competition cfp with --round.",
    );
  }
  return valid;
}

export function buildRosterQuery(options: InputOf<RosterQuery>): RosterQuery {
  return compact({
    year: options.year,
    team: options.team,
    classification: options.classification,
  });
}

export function validateRosterQuery(query: RosterQuery): RosterQuery {
  return parse(rosterSchema, query) as RosterQuery;
}

export function buildUsageQuery(options: InputOf<UsageQuery>): UsageQuery {
  return compact({ api: options.api, days: options.days, limit: options.limit });
}

export function validateUsageQuery(query: UsageQuery): UsageQuery {
  return parse(usageSchema, query) as UsageQuery;
}

export function buildGameTeamStatsQuery(
  options: InputOf<GameTeamStatsQuery>,
): GameTeamStatsQuery {
  return compact({
    id: options.id,
    year: options.year,
    week: options.week,
    team: options.team,
    conference: options.conference,
    seasonType: options.seasonType,
    classification: options.classification,
  });
}

function validateGameStatsFilters<T extends GameTeamStatsQuery>(query: T): T {
  if (query.id !== undefined) return query;
  if (query.year === undefined) {
    throw new QueryValidationError(
      "year is required when id is not specified",
      "Supply --id, or supply --year with --week, --team, or --conference.",
    );
  }
  if (query.week === undefined && query.team === undefined && query.conference === undefined) {
    throw new QueryValidationError(
      "one of week, team, or conference is required when id is not specified",
      "Supply --week, --team, or --conference with --year.",
    );
  }
  return query;
}

export function validateGameTeamStatsQuery(query: GameTeamStatsQuery): GameTeamStatsQuery {
  return validateGameStatsFilters(parse(gameTeamStatsSchema, query) as GameTeamStatsQuery);
}

export function buildGamePlayerStatsQuery(
  options: InputOf<GamePlayerStatsQuery>,
): GamePlayerStatsQuery {
  return compact({
    id: options.id,
    year: options.year,
    week: options.week,
    team: options.team,
    conference: options.conference,
    category: options.category,
    seasonType: options.seasonType,
    classification: options.classification,
  });
}

export function validateGamePlayerStatsQuery(
  query: GamePlayerStatsQuery,
): GamePlayerStatsQuery {
  return validateGameStatsFilters(
    parse(gamePlayerStatsSchema, query) as GamePlayerStatsQuery,
  );
}

export function buildDrivesQuery(options: InputOf<DrivesQuery>): InputOf<DrivesQuery> {
  return compact({
    year: options.year,
    week: options.week,
    seasonType: options.seasonType,
    team: options.team,
    offense: options.offense,
    defense: options.defense,
    conference: options.conference,
    offenseConference: options.offenseConference,
    defenseConference: options.defenseConference,
    classification: options.classification,
  });
}

export function validateDrivesQuery(query: InputOf<DrivesQuery>): DrivesQuery {
  const valid = parse(drivesSchema, query);
  if (valid.year === undefined) {
    throw new QueryValidationError("year is required", "Supply --year.");
  }
  return valid as DrivesQuery;
}

export function buildPlaysQuery(options: InputOf<PlaysQuery>): InputOf<PlaysQuery> {
  return compact({
    year: options.year,
    week: options.week,
    seasonType: options.seasonType,
    team: options.team,
    offense: options.offense,
    defense: options.defense,
    conference: options.conference,
    offenseConference: options.offenseConference,
    defenseConference: options.defenseConference,
    playType: options.playType,
    classification: options.classification,
  });
}

export function validatePlaysQuery(query: InputOf<PlaysQuery>): PlaysQuery {
  const valid = parse(playsSchema, query);
  if (valid.year === undefined || valid.week === undefined) {
    throw new QueryValidationError(
      "year and week are required",
      "Supply both --year and --week.",
    );
  }
  return valid as PlaysQuery;
}

export function buildPlayStatsQuery(options: InputOf<PlayStatsQuery>): PlayStatsQuery {
  return compact({
    gameId: options.gameId,
    athleteId: options.athleteId,
    statTypeId: options.statTypeId,
    year: options.year,
    week: options.week,
    team: options.team,
    conference: options.conference,
    seasonType: options.seasonType,
  });
}

export function validatePlayStatsQuery(query: PlayStatsQuery): PlayStatsQuery {
  return parse(playStatsSchema, query) as PlayStatsQuery;
}

export function buildAdvancedGameStatsQuery(
  options: InputOf<AdvancedGameStatsQuery>,
): AdvancedGameStatsQuery {
  return compact({
    year: options.year,
    team: options.team,
    week: options.week,
    opponent: options.opponent,
    seasonType: options.seasonType,
    excludeGarbageTime: options.excludeGarbageTime,
  });
}

export function validateAdvancedGameStatsQuery(
  query: AdvancedGameStatsQuery,
): AdvancedGameStatsQuery {
  const valid = parse(advancedGameStatsSchema, query) as AdvancedGameStatsQuery;
  if (valid.year === undefined && valid.team === undefined) {
    throw new QueryValidationError(
      "at least one of year or team is required",
      "Supply --year or --team.",
    );
  }
  return valid;
}

export function buildPlayerUsageQuery(
  options: InputOf<PlayerUsageQuery>,
): InputOf<PlayerUsageQuery> {
  return compact({
    year: options.year,
    team: options.team,
    conference: options.conference,
    playerId: options.playerId,
    position: options.position,
    excludeGarbageTime: options.excludeGarbageTime,
  });
}

export function validatePlayerUsageQuery(query: InputOf<PlayerUsageQuery>): PlayerUsageQuery {
  const valid = parse(playerUsageSchema, query);
  if (valid.year === undefined) {
    throw new QueryValidationError("year is required", "Supply --year.");
  }
  return valid as PlayerUsageQuery;
}

export function buildAdvancedSeasonStatsQuery(
  options: InputOf<AdvancedSeasonStatsQuery>,
): AdvancedSeasonStatsQuery {
  return compact({
    year: options.year,
    team: options.team,
    startWeek: options.startWeek,
    endWeek: options.endWeek,
    classification: options.classification,
    excludeGarbageTime: options.excludeGarbageTime,
  });
}

export function validateAdvancedSeasonStatsQuery(
  query: AdvancedSeasonStatsQuery,
): AdvancedSeasonStatsQuery {
  const valid = parse(advancedSeasonStatsSchema, query) as AdvancedSeasonStatsQuery;
  if (valid.year === undefined && valid.team === undefined) {
    throw new QueryValidationError(
      "at least one of year or team is required",
      "Supply --year or --team.",
    );
  }
  if (
    valid.startWeek !== undefined &&
    valid.endWeek !== undefined &&
    valid.startWeek > valid.endWeek
  ) {
    throw new QueryValidationError(
      "startWeek must be less than or equal to endWeek",
      "Use an --end-week value greater than or equal to --start-week.",
    );
  }
  return valid;
}

export function buildWeatherQuery(options: InputOf<WeatherQuery>): WeatherQuery {
  return compact({
    gameId: options.gameId,
    year: options.year,
    week: options.week,
    team: options.team,
    conference: options.conference,
    seasonType: options.seasonType,
    classification: options.classification,
  });
}

export function validateWeatherQuery(query: WeatherQuery): WeatherQuery {
  const valid = parse(weatherSchema, query) as WeatherQuery;
  if (valid.gameId === undefined && valid.year === undefined) {
    throw new QueryValidationError(
      "year is required when gameId is not specified",
      "Supply --year or query one game with --game-id.",
    );
  }
  return valid;
}

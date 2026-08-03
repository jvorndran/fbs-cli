import type {
  GetAdvancedBoxScoreData,
  GetCalendarData,
  GetCfpGamesData,
  GetCfpParticipantsData,
  GetCfpPlayoffData,
  GetLivePlaysData,
  GetLinesData,
  GetMatchupData,
  GetMediaData,
  GetRecordsData,
  GetScoreboardData,
  GetTalentData,
  GetTeamsData,
  GetTeamsAtsData,
} from "cfbd";
import { z } from "zod";

import { fromZodError, QueryValidationError } from "../errors";
import { removeUndefined } from "../utils/remove-nullish";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;
type InputOf<T> = { [K in keyof T]?: T[K] };
type WithoutUndefined<T extends Record<string, unknown>> = {
  [K in keyof T]?: Exclude<T[K], undefined>;
};

export type TeamsQuery = QueryOf<GetTeamsData>;
export type MatchupQuery = QueryOf<GetMatchupData>;
export type TalentQuery = QueryOf<GetTalentData>;
export type CfpPlayoffQuery = QueryOf<GetCfpPlayoffData>;
export type CfpParticipantsQuery = QueryOf<GetCfpParticipantsData>;
export type CfpGamesQuery = QueryOf<GetCfpGamesData>;
export type MediaQuery = QueryOf<GetMediaData>;
export type LivePlaysQuery = QueryOf<GetLivePlaysData>;
export type LinesQuery = QueryOf<GetLinesData>;
export type TeamAtsQuery = QueryOf<GetTeamsAtsData>;
export type RecordsQuery = QueryOf<GetRecordsData>;
export type CalendarQuery = QueryOf<GetCalendarData>;
export type ScoreboardQuery = QueryOf<GetScoreboardData>;
export type AdvancedBoxScoreQuery = QueryOf<GetAdvancedBoxScoreData>;
export type NoQuery = Record<string, never>;

const positiveInteger = z.number().int().positive();
const nonNegativeInteger = z.number().int().nonnegative();
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
const playoffRound = z.enum([
  "first_round",
  "quarterfinal",
  "semifinal",
  "championship",
]);
const mediaType = z.enum(["tv", "radio", "web", "ppv", "mobile"]);

const noQuerySchema = z.object({}).strict();
const teamsSchema = z.object({
  conference: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const matchupSchema = z.object({
  maxYear: positiveInteger.optional(),
  minYear: positiveInteger.optional(),
  team1: nonEmptyString.optional(),
  team2: nonEmptyString.optional(),
});
const talentSchema = z.object({ year: positiveInteger.optional() });
const yearSchema = z.object({ year: positiveInteger.optional() });
const cfpGamesSchema = yearSchema.extend({ round: playoffRound.optional() });
const mediaSchema = yearSchema.extend({
  classification: classification.optional(),
  conference: nonEmptyString.optional(),
  mediaType: mediaType.optional(),
  seasonType: seasonType.optional(),
  team: nonEmptyString.optional(),
  week: nonNegativeInteger.optional(),
});
const livePlaysSchema = z.object({ gameId: positiveInteger.optional() });
const linesSchema = z.object({
  away: nonEmptyString.optional(),
  conference: nonEmptyString.optional(),
  gameId: positiveInteger.optional(),
  home: nonEmptyString.optional(),
  provider: nonEmptyString.optional(),
  seasonType: seasonType.optional(),
  team: nonEmptyString.optional(),
  week: nonNegativeInteger.optional(),
  year: positiveInteger.optional(),
});
const teamAtsSchema = z.object({
  conference: nonEmptyString.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const recordsSchema = z.object({
  conference: nonEmptyString.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const scoreboardSchema = z.object({
  classification: classification.optional(),
  conference: nonEmptyString.optional(),
});
const advancedBoxScoreSchema = z.object({ id: positiveInteger.optional() });

function compact<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return removeUndefined(value) as WithoutUndefined<T>;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw fromZodError(result.error);
  return result.data;
}

function requireYear<T extends { year?: number | undefined }>(
  value: T,
): T & { year: number } {
  if (value.year === undefined) {
    throw new QueryValidationError("year is required", "Supply --year.");
  }
  return value as T & { year: number };
}

export function buildNoQuery(): NoQuery {
  return {};
}

export function validateNoQuery(query: NoQuery): NoQuery {
  return parse(noQuerySchema, query);
}

export function buildTeamsQuery(options: InputOf<TeamsQuery>): TeamsQuery {
  return compact({ conference: options.conference, year: options.year });
}

export function validateTeamsQuery(query: TeamsQuery): TeamsQuery {
  return parse(teamsSchema, query) as TeamsQuery;
}

export function buildMatchupQuery(
  options: InputOf<MatchupQuery>,
): InputOf<MatchupQuery> {
  return compact({
    maxYear: options.maxYear,
    minYear: options.minYear,
    team1: options.team1,
    team2: options.team2,
  });
}

export function validateMatchupQuery(query: InputOf<MatchupQuery>): MatchupQuery {
  const valid = parse(matchupSchema, query);
  if (valid.team1 === undefined || valid.team2 === undefined) {
    throw new QueryValidationError(
      "team1 and team2 are required",
      "Supply both --team1 and --team2.",
    );
  }
  if (
    valid.minYear !== undefined &&
    valid.maxYear !== undefined &&
    valid.minYear > valid.maxYear
  ) {
    throw new QueryValidationError(
      "minYear must be less than or equal to maxYear",
      "Use a --max-year value greater than or equal to --min-year.",
    );
  }
  return valid as MatchupQuery;
}

export function buildTalentQuery(options: InputOf<TalentQuery>): InputOf<TalentQuery> {
  return compact({ year: options.year });
}

export function validateTalentQuery(query: InputOf<TalentQuery>): TalentQuery {
  return requireYear(parse(talentSchema, query)) as TalentQuery;
}

export function buildCfpPlayoffQuery(
  options: InputOf<CfpPlayoffQuery>,
): InputOf<CfpPlayoffQuery> {
  return compact({ year: options.year });
}

export function validateCfpPlayoffQuery(
  query: InputOf<CfpPlayoffQuery>,
): CfpPlayoffQuery {
  return requireYear(parse(yearSchema, query)) as CfpPlayoffQuery;
}

export function buildCfpParticipantsQuery(
  options: InputOf<CfpParticipantsQuery>,
): InputOf<CfpParticipantsQuery> {
  return compact({ year: options.year });
}

export function validateCfpParticipantsQuery(
  query: InputOf<CfpParticipantsQuery>,
): CfpParticipantsQuery {
  return requireYear(parse(yearSchema, query)) as CfpParticipantsQuery;
}

export function buildCfpGamesQuery(
  options: InputOf<CfpGamesQuery>,
): InputOf<CfpGamesQuery> {
  return compact({ round: options.round, year: options.year });
}

export function validateCfpGamesQuery(
  query: InputOf<CfpGamesQuery>,
): CfpGamesQuery {
  return requireYear(parse(cfpGamesSchema, query)) as CfpGamesQuery;
}

export function buildMediaQuery(options: InputOf<MediaQuery>): InputOf<MediaQuery> {
  return compact({
    classification: options.classification,
    conference: options.conference,
    mediaType: options.mediaType,
    seasonType: options.seasonType,
    team: options.team,
    week: options.week,
    year: options.year,
  });
}

export function validateMediaQuery(query: InputOf<MediaQuery>): MediaQuery {
  return requireYear(parse(mediaSchema, query)) as MediaQuery;
}

export function buildLivePlaysQuery(
  options: InputOf<LivePlaysQuery>,
): InputOf<LivePlaysQuery> {
  return compact({ gameId: options.gameId });
}

export function validateLivePlaysQuery(
  query: InputOf<LivePlaysQuery>,
): LivePlaysQuery {
  const valid = parse(livePlaysSchema, query);
  if (valid.gameId === undefined) {
    throw new QueryValidationError("gameId is required", "Supply --game-id.");
  }
  return valid as LivePlaysQuery;
}

export function buildLinesQuery(
  options: InputOf<LinesQuery>,
): InputOf<LinesQuery> {
  return compact({
    away: options.away,
    conference: options.conference,
    gameId: options.gameId,
    home: options.home,
    provider: options.provider,
    seasonType: options.seasonType,
    team: options.team,
    week: options.week,
    year: options.year,
  });
}

export function validateLinesQuery(query: InputOf<LinesQuery>): LinesQuery {
  const valid = parse(linesSchema, query);
  if (valid.gameId === undefined && valid.year === undefined) {
    throw new QueryValidationError(
      "year is required when gameId is not specified",
      "Supply --year or query one game with --game-id.",
    );
  }
  return valid as LinesQuery;
}

export function buildTeamAtsQuery(
  options: InputOf<TeamAtsQuery>,
): InputOf<TeamAtsQuery> {
  return compact({
    conference: options.conference,
    team: options.team,
    year: options.year,
  });
}

export function validateTeamAtsQuery(
  query: InputOf<TeamAtsQuery>,
): TeamAtsQuery {
  return requireYear(parse(teamAtsSchema, query)) as TeamAtsQuery;
}

export function buildRecordsQuery(options: InputOf<RecordsQuery>): RecordsQuery {
  return compact({
    conference: options.conference,
    team: options.team,
    year: options.year,
  });
}

export function validateRecordsQuery(query: RecordsQuery): RecordsQuery {
  const valid = parse(recordsSchema, query) as RecordsQuery;
  if (valid.year === undefined && valid.team === undefined) {
    throw new QueryValidationError(
      "year or team is required",
      "Supply --year or --team.",
    );
  }
  return valid;
}

export function buildCalendarQuery(
  options: InputOf<CalendarQuery>,
): InputOf<CalendarQuery> {
  return compact({ year: options.year });
}

export function validateCalendarQuery(query: InputOf<CalendarQuery>): CalendarQuery {
  return requireYear(parse(yearSchema, query)) as CalendarQuery;
}

export function buildScoreboardQuery(
  options: InputOf<ScoreboardQuery>,
): ScoreboardQuery {
  return compact({
    classification: options.classification,
    conference: options.conference,
  });
}

export function validateScoreboardQuery(query: ScoreboardQuery): ScoreboardQuery {
  return parse(scoreboardSchema, query) as ScoreboardQuery;
}

export function buildAdvancedBoxScoreQuery(
  options: InputOf<AdvancedBoxScoreQuery>,
): InputOf<AdvancedBoxScoreQuery> {
  return compact({ id: options.id });
}

export function validateAdvancedBoxScoreQuery(
  query: InputOf<AdvancedBoxScoreQuery>,
): AdvancedBoxScoreQuery {
  const valid = parse(advancedBoxScoreSchema, query);
  if (valid.id === undefined) {
    throw new QueryValidationError("id is required", "Supply --id.");
  }
  return valid as AdvancedBoxScoreQuery;
}

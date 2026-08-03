import type {
  GetAdjustedPlayerPassingStatsData,
  GetAdjustedPlayerRushingStatsData,
  GetAdjustedTeamSeasonStatsData,
  GetAggregatedTeamRecruitingRatingsData,
  GetCoachProfileData,
  GetCoachSeasonsData,
  GetCoachTenuresData,
  GetCoachesData,
  GetConferenceSpData,
  GetDraftPicksData,
  GetEloData,
  GetExpandedSrsData,
  GetFpiData,
  GetKickerPaarData,
  GetRankingsData,
  GetRecruitsData,
  GetSpData,
  GetSrsData,
  GetTeamRecruitingRankingsData,
} from "cfbd";
import { z } from "zod";

import { fromZodError, QueryValidationError } from "../errors";
import { removeUndefined } from "../utils/remove-nullish";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;
type InputOf<T> = { [K in keyof T]?: T[K] };
type WithoutUndefined<T extends Record<string, unknown>> = {
  [K in keyof T]?: Exclude<T[K], undefined>;
};

export type WepaTeamSeasonQuery = QueryOf<GetAdjustedTeamSeasonStatsData>;
export type WepaPassingQuery = QueryOf<GetAdjustedPlayerPassingStatsData>;
export type WepaRushingQuery = QueryOf<GetAdjustedPlayerRushingStatsData>;
export type WepaKickingQuery = QueryOf<GetKickerPaarData>;
export type RecruitingPlayersQuery = QueryOf<GetRecruitsData>;
export type RecruitingTeamsQuery = QueryOf<GetTeamRecruitingRankingsData>;
export type RecruitingGroupsQuery = QueryOf<GetAggregatedTeamRecruitingRatingsData>;
export type SpRatingsQuery = QueryOf<GetSpData>;
export type ConferenceSpRatingsQuery = QueryOf<GetConferenceSpData>;
export type SrsRatingsQuery = QueryOf<GetSrsData>;
export type ExpandedSrsRatingsQuery = QueryOf<GetExpandedSrsData>;
export type EloRatingsQuery = QueryOf<GetEloData>;
export type FpiRatingsQuery = QueryOf<GetFpiData>;
export type RankingsQuery = QueryOf<GetRankingsData>;
export type DraftPicksQuery = QueryOf<GetDraftPicksData>;
export type CoachesQuery = QueryOf<GetCoachesData>;
export type CoachProfileQuery = QueryOf<GetCoachProfileData>;
export type CoachSeasonsQuery = QueryOf<GetCoachSeasonsData>;
export type CoachTenuresQuery = QueryOf<GetCoachTenuresData>;

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
const recruitClassification = z.enum(["JUCO", "PrepSchool", "HighSchool"]);

const wepaTeamSeasonSchema = z.object({
  conference: nonEmptyString.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const wepaPlayerSchema = wepaTeamSeasonSchema.extend({
  position: nonEmptyString.optional(),
});
const recruitingPlayersSchema = z.object({
  classification: recruitClassification.optional(),
  position: nonEmptyString.optional(),
  state: nonEmptyString.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const recruitingTeamsSchema = z.object({
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const recruitingGroupsSchema = z.object({
  conference: nonEmptyString.optional(),
  endYear: positiveInteger.optional(),
  recruitType: recruitClassification.optional(),
  startYear: positiveInteger.optional(),
  team: nonEmptyString.optional(),
});
const yearOrTeamSchema = z.object({
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const conferenceSpSchema = z.object({
  classification: classification.optional(),
  conference: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const srsSchema = yearOrTeamSchema.extend({ conference: nonEmptyString.optional() });
const expandedSrsSchema = srsSchema.extend({ classification: classification.optional() });
const eloSchema = srsSchema.extend({
  seasonType: seasonType.optional(),
  week: nonNegativeInteger.optional(),
});
const rankingsSchema = z.object({
  final: z.boolean().optional(),
  latest: z.boolean().optional(),
  poll: z.literal("cfp").optional(),
  seasonType: seasonType.optional(),
  week: nonNegativeInteger.optional(),
  year: positiveInteger.optional(),
});
const draftPicksSchema = z.object({
  conference: nonEmptyString.optional(),
  position: nonEmptyString.optional(),
  school: nonEmptyString.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const coachesSchema = z.object({
  firstName: nonEmptyString.optional(),
  lastName: nonEmptyString.optional(),
  maxYear: positiveInteger.optional(),
  minYear: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const coachProfileSchema = z.object({ coachId: positiveInteger.optional() });
const coachSeasonsSchema = z.object({
  coachId: positiveInteger.optional(),
  maxYear: positiveInteger.optional(),
  minYear: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});
const coachTenuresSchema = z.object({
  active: z.boolean().optional(),
  coachId: positiveInteger.optional(),
  team: nonEmptyString.optional(),
  year: positiveInteger.optional(),
});

function compact<T extends Record<string, unknown>>(value: T): WithoutUndefined<T> {
  return removeUndefined(value) as WithoutUndefined<T>;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw fromZodError(result.error);
  return result.data;
}

function requireYearOrTeam<T extends { year?: number; team?: string }>(query: T): T {
  if (query.year === undefined && query.team === undefined) {
    throw new QueryValidationError(
      "at least one of year or team is required",
      "Supply --year or --team.",
    );
  }
  return query;
}

function requireAscendingYears<T extends { startYear?: number; endYear?: number }>(
  query: T,
): T {
  if (
    query.startYear !== undefined &&
    query.endYear !== undefined &&
    query.startYear > query.endYear
  ) {
    throw new QueryValidationError(
      "startYear must be less than or equal to endYear",
      "Use an --end-year value greater than or equal to --start-year.",
    );
  }
  return query;
}

function requireAscendingCoachYears<T extends { minYear?: number; maxYear?: number }>(
  query: T,
): T {
  if (
    query.minYear !== undefined &&
    query.maxYear !== undefined &&
    query.minYear > query.maxYear
  ) {
    throw new QueryValidationError(
      "minYear must be less than or equal to maxYear",
      "Use a --max-year value greater than or equal to --min-year.",
    );
  }
  return query;
}

export function buildWepaTeamSeasonQuery(
  options: InputOf<WepaTeamSeasonQuery>,
): WepaTeamSeasonQuery {
  return compact({ conference: options.conference, team: options.team, year: options.year });
}

export function validateWepaTeamSeasonQuery(
  query: InputOf<WepaTeamSeasonQuery>,
): WepaTeamSeasonQuery {
  return parse(wepaTeamSeasonSchema, query) as WepaTeamSeasonQuery;
}

export function buildWepaPassingQuery(
  options: InputOf<WepaPassingQuery>,
): WepaPassingQuery {
  return compact({
    conference: options.conference,
    position: options.position,
    team: options.team,
    year: options.year,
  });
}

export function validateWepaPassingQuery(query: InputOf<WepaPassingQuery>): WepaPassingQuery {
  return parse(wepaPlayerSchema, query) as WepaPassingQuery;
}

export function buildWepaRushingQuery(
  options: InputOf<WepaRushingQuery>,
): WepaRushingQuery {
  return compact({
    conference: options.conference,
    position: options.position,
    team: options.team,
    year: options.year,
  });
}

export function validateWepaRushingQuery(query: InputOf<WepaRushingQuery>): WepaRushingQuery {
  return parse(wepaPlayerSchema, query) as WepaRushingQuery;
}

export function buildWepaKickingQuery(
  options: InputOf<WepaKickingQuery>,
): WepaKickingQuery {
  return compact({ conference: options.conference, team: options.team, year: options.year });
}

export function validateWepaKickingQuery(query: InputOf<WepaKickingQuery>): WepaKickingQuery {
  return parse(wepaTeamSeasonSchema, query) as WepaKickingQuery;
}

export function buildRecruitingPlayersQuery(
  options: InputOf<RecruitingPlayersQuery>,
): InputOf<RecruitingPlayersQuery> {
  return compact({
    classification: options.classification,
    position: options.position,
    state: options.state,
    team: options.team,
    year: options.year,
  });
}

export function validateRecruitingPlayersQuery(
  query: InputOf<RecruitingPlayersQuery>,
): RecruitingPlayersQuery {
  return requireYearOrTeam(
    parse(recruitingPlayersSchema, query) as RecruitingPlayersQuery,
  );
}

export function buildRecruitingTeamsQuery(
  options: InputOf<RecruitingTeamsQuery>,
): RecruitingTeamsQuery {
  return compact({ team: options.team, year: options.year });
}

export function validateRecruitingTeamsQuery(
  query: InputOf<RecruitingTeamsQuery>,
): RecruitingTeamsQuery {
  return parse(recruitingTeamsSchema, query) as RecruitingTeamsQuery;
}

export function buildRecruitingGroupsQuery(
  options: InputOf<RecruitingGroupsQuery>,
): RecruitingGroupsQuery {
  return compact({
    conference: options.conference,
    endYear: options.endYear,
    recruitType: options.recruitType,
    startYear: options.startYear,
    team: options.team,
  });
}

export function validateRecruitingGroupsQuery(
  query: InputOf<RecruitingGroupsQuery>,
): RecruitingGroupsQuery {
  return requireAscendingYears(
    parse(recruitingGroupsSchema, query) as RecruitingGroupsQuery,
  );
}

export function buildSpRatingsQuery(options: InputOf<SpRatingsQuery>): SpRatingsQuery {
  return compact({ team: options.team, year: options.year });
}

export function validateSpRatingsQuery(query: InputOf<SpRatingsQuery>): SpRatingsQuery {
  return requireYearOrTeam(parse(yearOrTeamSchema, query) as SpRatingsQuery);
}

export function buildConferenceSpRatingsQuery(
  options: InputOf<ConferenceSpRatingsQuery>,
): ConferenceSpRatingsQuery {
  return compact({
    classification: options.classification,
    conference: options.conference,
    year: options.year,
  });
}

export function validateConferenceSpRatingsQuery(
  query: InputOf<ConferenceSpRatingsQuery>,
): ConferenceSpRatingsQuery {
  return parse(conferenceSpSchema, query) as ConferenceSpRatingsQuery;
}

export function buildSrsRatingsQuery(options: InputOf<SrsRatingsQuery>): SrsRatingsQuery {
  return compact({ conference: options.conference, team: options.team, year: options.year });
}

export function validateSrsRatingsQuery(query: InputOf<SrsRatingsQuery>): SrsRatingsQuery {
  return requireYearOrTeam(parse(srsSchema, query) as SrsRatingsQuery);
}

export function buildExpandedSrsRatingsQuery(
  options: InputOf<ExpandedSrsRatingsQuery>,
): ExpandedSrsRatingsQuery {
  return compact({
    classification: options.classification,
    conference: options.conference,
    team: options.team,
    year: options.year,
  });
}

export function validateExpandedSrsRatingsQuery(
  query: InputOf<ExpandedSrsRatingsQuery>,
): ExpandedSrsRatingsQuery {
  return requireYearOrTeam(
    parse(expandedSrsSchema, query) as ExpandedSrsRatingsQuery,
  );
}

export function buildEloRatingsQuery(options: InputOf<EloRatingsQuery>): EloRatingsQuery {
  return compact({
    conference: options.conference,
    seasonType: options.seasonType,
    team: options.team,
    week: options.week,
    year: options.year,
  });
}

export function validateEloRatingsQuery(query: InputOf<EloRatingsQuery>): EloRatingsQuery {
  return parse(eloSchema, query) as EloRatingsQuery;
}

export function buildFpiRatingsQuery(options: InputOf<FpiRatingsQuery>): FpiRatingsQuery {
  return compact({ conference: options.conference, team: options.team, year: options.year });
}

export function validateFpiRatingsQuery(query: InputOf<FpiRatingsQuery>): FpiRatingsQuery {
  return requireYearOrTeam(parse(srsSchema, query) as FpiRatingsQuery);
}

export function buildRankingsQuery(
  options: InputOf<RankingsQuery>,
): InputOf<RankingsQuery> {
  return compact({
    final: options.final,
    latest: options.latest,
    poll: options.poll,
    seasonType: options.seasonType,
    week: options.week,
    year: options.year,
  });
}

export function validateRankingsQuery(query: InputOf<RankingsQuery>): RankingsQuery {
  const valid = parse(rankingsSchema, query);
  if (valid.year === undefined) {
    throw new QueryValidationError("year is required", "Supply --year.");
  }
  return valid as RankingsQuery;
}

export function buildDraftPicksQuery(options: InputOf<DraftPicksQuery>): DraftPicksQuery {
  return compact({
    conference: options.conference,
    position: options.position,
    school: options.school,
    team: options.team,
    year: options.year,
  });
}

export function validateDraftPicksQuery(query: InputOf<DraftPicksQuery>): DraftPicksQuery {
  return parse(draftPicksSchema, query) as DraftPicksQuery;
}

export function buildCoachesQuery(options: InputOf<CoachesQuery>): CoachesQuery {
  return compact({
    firstName: options.firstName,
    lastName: options.lastName,
    maxYear: options.maxYear,
    minYear: options.minYear,
    team: options.team,
    year: options.year,
  });
}

export function validateCoachesQuery(query: InputOf<CoachesQuery>): CoachesQuery {
  return requireAscendingCoachYears(parse(coachesSchema, query) as CoachesQuery);
}

export function buildCoachProfileQuery(
  options: InputOf<CoachProfileQuery>,
): InputOf<CoachProfileQuery> {
  return compact({ coachId: options.coachId });
}

export function validateCoachProfileQuery(
  query: InputOf<CoachProfileQuery>,
): CoachProfileQuery {
  const valid = parse(coachProfileSchema, query);
  if (valid.coachId === undefined) {
    throw new QueryValidationError("coachId is required", "Supply --coach-id.");
  }
  return valid as CoachProfileQuery;
}

export function buildCoachSeasonsQuery(
  options: InputOf<CoachSeasonsQuery>,
): CoachSeasonsQuery {
  return compact({
    coachId: options.coachId,
    maxYear: options.maxYear,
    minYear: options.minYear,
    team: options.team,
    year: options.year,
  });
}

export function validateCoachSeasonsQuery(
  query: InputOf<CoachSeasonsQuery>,
): CoachSeasonsQuery {
  return requireAscendingCoachYears(
    parse(coachSeasonsSchema, query) as CoachSeasonsQuery,
  );
}

export function buildCoachTenuresQuery(
  options: InputOf<CoachTenuresQuery>,
): CoachTenuresQuery {
  return compact({
    active: options.active,
    coachId: options.coachId,
    team: options.team,
    year: options.year,
  });
}

export function validateCoachTenuresQuery(
  query: InputOf<CoachTenuresQuery>,
): CoachTenuresQuery {
  return parse(coachTenuresSchema, query) as CoachTenuresQuery;
}

import {
  getAdjustedPlayerPassingStats,
  getAdjustedPlayerRushingStats,
  getAdjustedTeamSeasonStats,
  getAggregatedTeamRecruitingRatings,
  getCoachProfile,
  getCoachSeasons,
  getCoachTenures,
  getCoaches,
  getConferenceSp,
  getDraftPicks,
  getDraftPositions,
  getDraftTeams,
  getElo,
  getExpandedSrs,
  getFpi,
  getKickerPaar,
  getRankings,
  getRecruits,
  getSp,
  getSrs,
  getTeamRecruitingRankings,
} from "cfbd";
import type {
  GetAdjustedPlayerPassingStatsResponse,
  GetAdjustedPlayerRushingStatsResponse,
  GetAdjustedTeamSeasonStatsResponse,
  GetAggregatedTeamRecruitingRatingsResponse,
  GetCoachProfileResponse,
  GetCoachSeasonsResponse,
  GetCoachTenuresResponse,
  GetCoachesResponse,
  GetConferenceSpResponse,
  GetDraftPicksResponse,
  GetDraftPositionsResponse,
  GetDraftTeamsResponse,
  GetEloResponse,
  GetExpandedSrsResponse,
  GetFpiResponse,
  GetKickerPaarResponse,
  GetRankingsResponse,
  GetRecruitsResponse,
  GetSpResponse,
  GetSrsResponse,
  GetTeamRecruitingRankingsResponse,
} from "cfbd";

import type { CfbdApiContext } from "./context";
import type {
  CoachProfileQuery,
  CoachSeasonsQuery,
  CoachTenuresQuery,
  CoachesQuery,
  ConferenceSpRatingsQuery,
  DraftPicksQuery,
  EloRatingsQuery,
  ExpandedSrsRatingsQuery,
  FpiRatingsQuery,
  RankingsQuery,
  RecruitingGroupsQuery,
  RecruitingPlayersQuery,
  RecruitingTeamsQuery,
  SpRatingsQuery,
  SrsRatingsQuery,
  WepaKickingQuery,
  WepaPassingQuery,
  WepaRushingQuery,
  WepaTeamSeasonQuery,
} from "./query-builders-analytics";

export interface AnalyticsCfbdApi {
  wepaTeamSeason(query: WepaTeamSeasonQuery): Promise<GetAdjustedTeamSeasonStatsResponse>;
  wepaPassing(query: WepaPassingQuery): Promise<GetAdjustedPlayerPassingStatsResponse>;
  wepaRushing(query: WepaRushingQuery): Promise<GetAdjustedPlayerRushingStatsResponse>;
  wepaKicking(query: WepaKickingQuery): Promise<GetKickerPaarResponse>;
  recruitingPlayers(query: RecruitingPlayersQuery): Promise<GetRecruitsResponse>;
  recruitingTeams(query: RecruitingTeamsQuery): Promise<GetTeamRecruitingRankingsResponse>;
  recruitingGroups(
    query: RecruitingGroupsQuery,
  ): Promise<GetAggregatedTeamRecruitingRatingsResponse>;
  spRatings(query: SpRatingsQuery): Promise<GetSpResponse>;
  conferenceSpRatings(query: ConferenceSpRatingsQuery): Promise<GetConferenceSpResponse>;
  srsRatings(query: SrsRatingsQuery): Promise<GetSrsResponse>;
  expandedSrsRatings(query: ExpandedSrsRatingsQuery): Promise<GetExpandedSrsResponse>;
  eloRatings(query: EloRatingsQuery): Promise<GetEloResponse>;
  fpiRatings(query: FpiRatingsQuery): Promise<GetFpiResponse>;
  rankings(query: RankingsQuery): Promise<GetRankingsResponse>;
  draftTeams(): Promise<GetDraftTeamsResponse>;
  draftPositions(): Promise<GetDraftPositionsResponse>;
  draftPicks(query: DraftPicksQuery): Promise<GetDraftPicksResponse>;
  coaches(query: CoachesQuery): Promise<GetCoachesResponse>;
  coachProfile(query: CoachProfileQuery): Promise<GetCoachProfileResponse>;
  coachSeasons(query: CoachSeasonsQuery): Promise<GetCoachSeasonsResponse>;
  coachTenures(query: CoachTenuresQuery): Promise<GetCoachTenuresResponse>;
}

/**
 * Build methods after the shared CFBD client has been configured by the central
 * API factory. Keeping configuration in one place prevents accidental key churn.
 */
export function createAnalyticsCfbdApi(
  context: CfbdApiContext,
): AnalyticsCfbdApi {
  return {
    wepaTeamSeason: (query) =>
      context.execute<GetAdjustedTeamSeasonStatsResponse>(() =>
        getAdjustedTeamSeasonStats({ query, client: context.client }),
      ),
    wepaPassing: (query) =>
      context.execute<GetAdjustedPlayerPassingStatsResponse>(() =>
        getAdjustedPlayerPassingStats({ query, client: context.client }),
      ),
    wepaRushing: (query) =>
      context.execute<GetAdjustedPlayerRushingStatsResponse>(() =>
        getAdjustedPlayerRushingStats({ query, client: context.client }),
      ),
    wepaKicking: (query) =>
      context.execute<GetKickerPaarResponse>(() =>
        getKickerPaar({ query, client: context.client }),
      ),
    recruitingPlayers: (query) =>
      context.execute<GetRecruitsResponse>(() =>
        getRecruits({ query, client: context.client }),
      ),
    recruitingTeams: (query) =>
      context.execute<GetTeamRecruitingRankingsResponse>(() =>
        getTeamRecruitingRankings({ query, client: context.client }),
      ),
    recruitingGroups: (query) =>
      context.execute<GetAggregatedTeamRecruitingRatingsResponse>(() =>
        getAggregatedTeamRecruitingRatings({
          query,
          client: context.client,
        }),
      ),
    spRatings: (query) =>
      context.execute<GetSpResponse>(() =>
        getSp({ query, client: context.client }),
      ),
    conferenceSpRatings: (query) =>
      context.execute<GetConferenceSpResponse>(() =>
        getConferenceSp({ query, client: context.client }),
      ),
    srsRatings: (query) =>
      context.execute<GetSrsResponse>(() =>
        getSrs({ query, client: context.client }),
      ),
    expandedSrsRatings: (query) =>
      context.execute<GetExpandedSrsResponse>(() =>
        getExpandedSrs({ query, client: context.client }),
      ),
    eloRatings: (query) =>
      context.execute<GetEloResponse>(() =>
        getElo({ query, client: context.client }),
      ),
    fpiRatings: (query) =>
      context.execute<GetFpiResponse>(() =>
        getFpi({ query, client: context.client }),
      ),
    rankings: (query) =>
      context.execute<GetRankingsResponse>(() =>
        getRankings({ query, client: context.client }),
      ),
    draftTeams: () =>
      context.execute<GetDraftTeamsResponse>(() =>
        getDraftTeams({ client: context.client }),
      ),
    draftPositions: () =>
      context.execute<GetDraftPositionsResponse>(() =>
        getDraftPositions({ client: context.client }),
      ),
    draftPicks: (query) =>
      context.execute<GetDraftPicksResponse>(() =>
        getDraftPicks({ query, client: context.client }),
      ),
    coaches: (query) =>
      context.execute<GetCoachesResponse>(() =>
        getCoaches({ query, client: context.client }),
      ),
    coachProfile: (query) =>
      context.execute<GetCoachProfileResponse>(() =>
        getCoachProfile({ query, client: context.client }),
      ),
    coachSeasons: (query) =>
      context.execute<GetCoachSeasonsResponse>(() =>
        getCoachSeasons({ query, client: context.client }),
      ),
    coachTenures: (query) =>
      context.execute<GetCoachTenuresResponse>(() =>
        getCoachTenures({ query, client: context.client }),
      ),
  };
}

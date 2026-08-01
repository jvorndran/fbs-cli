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

import { executeCfbd } from "./execute";
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
export function createAnalyticsCfbdApi(): AnalyticsCfbdApi {
  return {
    wepaTeamSeason: (query) =>
      executeCfbd<GetAdjustedTeamSeasonStatsResponse>(() =>
        getAdjustedTeamSeasonStats({ query }),
      ),
    wepaPassing: (query) =>
      executeCfbd<GetAdjustedPlayerPassingStatsResponse>(() =>
        getAdjustedPlayerPassingStats({ query }),
      ),
    wepaRushing: (query) =>
      executeCfbd<GetAdjustedPlayerRushingStatsResponse>(() =>
        getAdjustedPlayerRushingStats({ query }),
      ),
    wepaKicking: (query) =>
      executeCfbd<GetKickerPaarResponse>(() => getKickerPaar({ query })),
    recruitingPlayers: (query) =>
      executeCfbd<GetRecruitsResponse>(() => getRecruits({ query })),
    recruitingTeams: (query) =>
      executeCfbd<GetTeamRecruitingRankingsResponse>(() =>
        getTeamRecruitingRankings({ query }),
      ),
    recruitingGroups: (query) =>
      executeCfbd<GetAggregatedTeamRecruitingRatingsResponse>(() =>
        getAggregatedTeamRecruitingRatings({ query }),
      ),
    spRatings: (query) => executeCfbd<GetSpResponse>(() => getSp({ query })),
    conferenceSpRatings: (query) =>
      executeCfbd<GetConferenceSpResponse>(() => getConferenceSp({ query })),
    srsRatings: (query) => executeCfbd<GetSrsResponse>(() => getSrs({ query })),
    expandedSrsRatings: (query) =>
      executeCfbd<GetExpandedSrsResponse>(() => getExpandedSrs({ query })),
    eloRatings: (query) => executeCfbd<GetEloResponse>(() => getElo({ query })),
    fpiRatings: (query) => executeCfbd<GetFpiResponse>(() => getFpi({ query })),
    rankings: (query) => executeCfbd<GetRankingsResponse>(() => getRankings({ query })),
    draftTeams: () => executeCfbd<GetDraftTeamsResponse>(() => getDraftTeams()),
    draftPositions: () =>
      executeCfbd<GetDraftPositionsResponse>(() => getDraftPositions()),
    draftPicks: (query) =>
      executeCfbd<GetDraftPicksResponse>(() => getDraftPicks({ query })),
    coaches: (query) => executeCfbd<GetCoachesResponse>(() => getCoaches({ query })),
    coachProfile: (query) =>
      executeCfbd<GetCoachProfileResponse>(() => getCoachProfile({ query })),
    coachSeasons: (query) =>
      executeCfbd<GetCoachSeasonsResponse>(() => getCoachSeasons({ query })),
    coachTenures: (query) =>
      executeCfbd<GetCoachTenuresResponse>(() => getCoachTenures({ query })),
  };
}

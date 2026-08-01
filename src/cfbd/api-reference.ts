import {
  getAdvancedBoxScore,
  getCalendar,
  getCfpGames,
  getCfpParticipants,
  getCfpPlayoff,
  getConferences,
  getLivePlays,
  getLines,
  getMatchup,
  getMedia,
  getPlayStatTypes,
  getPlayTypes,
  getRecords,
  getScoreboard,
  getTalent,
  getTeams,
  getTeamsAts,
  getUserInfo,
  getVenues,
} from "cfbd";
import type {
  GetAdvancedBoxScoreData,
  GetAdvancedBoxScoreResponse,
  GetCalendarData,
  GetCalendarResponse,
  GetCfpGamesData,
  GetCfpGamesResponse,
  GetCfpParticipantsData,
  GetCfpParticipantsResponse,
  GetCfpPlayoffData,
  GetCfpPlayoffResponse,
  GetConferencesResponse,
  GetLivePlaysData,
  GetLivePlaysResponse,
  GetLinesData,
  GetLinesResponse,
  GetMatchupData,
  GetMatchupResponse,
  GetMediaData,
  GetMediaResponse,
  GetPlayStatTypesResponse,
  GetPlayTypesResponse,
  GetRecordsData,
  GetRecordsResponse,
  GetScoreboardData,
  GetScoreboardResponse,
  GetTalentData,
  GetTalentResponse,
  GetTeamsData,
  GetTeamsResponse,
  GetTeamsAtsData,
  GetTeamsAtsResponse,
  GetUserInfoResponse,
  GetVenuesResponse,
} from "cfbd";

import { executeCfbd } from "./execute";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;

/** Additional reference, betting, live, playoff, and game-detail endpoints. */
export interface ReferenceCfbdApi {
  teams(query: QueryOf<GetTeamsData>): Promise<GetTeamsResponse>;
  matchup(query: QueryOf<GetMatchupData>): Promise<GetMatchupResponse>;
  conferences(): Promise<GetConferencesResponse>;
  talent(query: QueryOf<GetTalentData>): Promise<GetTalentResponse>;
  venues(): Promise<GetVenuesResponse>;
  playTypes(): Promise<GetPlayTypesResponse>;
  playStatTypes(): Promise<GetPlayStatTypesResponse>;
  cfpPlayoff(query: QueryOf<GetCfpPlayoffData>): Promise<GetCfpPlayoffResponse>;
  cfpParticipants(
    query: QueryOf<GetCfpParticipantsData>,
  ): Promise<GetCfpParticipantsResponse>;
  cfpGames(query: QueryOf<GetCfpGamesData>): Promise<GetCfpGamesResponse>;
  media(query: QueryOf<GetMediaData>): Promise<GetMediaResponse>;
  livePlays(query: QueryOf<GetLivePlaysData>): Promise<GetLivePlaysResponse>;
  lines(query: QueryOf<GetLinesData>): Promise<GetLinesResponse>;
  teamAts(query: QueryOf<GetTeamsAtsData>): Promise<GetTeamsAtsResponse>;
  userInfo(): Promise<GetUserInfoResponse>;
  records(query: QueryOf<GetRecordsData>): Promise<GetRecordsResponse>;
  calendar(query: QueryOf<GetCalendarData>): Promise<GetCalendarResponse>;
  scoreboard(query: QueryOf<GetScoreboardData>): Promise<GetScoreboardResponse>;
  advancedBoxScore(
    query: QueryOf<GetAdvancedBoxScoreData>,
  ): Promise<GetAdvancedBoxScoreResponse>;
}

/** Cast the centrally composed API after the root adapter includes this slice. */
export function asReferenceCfbdApi(api: object): ReferenceCfbdApi {
  return api as ReferenceCfbdApi;
}

export function createReferenceCfbdApi(): ReferenceCfbdApi {
  return {
    teams: (query) => executeCfbd<GetTeamsResponse>(() => getTeams({ query })),
    matchup: (query) =>
      executeCfbd<GetMatchupResponse>(() => getMatchup({ query })),
    conferences: () =>
      executeCfbd<GetConferencesResponse>(() => getConferences()),
    talent: (query) =>
      executeCfbd<GetTalentResponse>(() => getTalent({ query })),
    venues: () => executeCfbd<GetVenuesResponse>(() => getVenues()),
    playTypes: () =>
      executeCfbd<GetPlayTypesResponse>(() => getPlayTypes()),
    playStatTypes: () =>
      executeCfbd<GetPlayStatTypesResponse>(() => getPlayStatTypes()),
    cfpPlayoff: (query) =>
      executeCfbd<GetCfpPlayoffResponse>(() => getCfpPlayoff({ query })),
    cfpParticipants: (query) =>
      executeCfbd<GetCfpParticipantsResponse>(() => getCfpParticipants({ query })),
    cfpGames: (query) =>
      executeCfbd<GetCfpGamesResponse>(() => getCfpGames({ query })),
    media: (query) =>
      executeCfbd<GetMediaResponse>(() => getMedia({ query })),
    livePlays: (query) =>
      executeCfbd<GetLivePlaysResponse>(() => getLivePlays({ query })),
    lines: (query) =>
      executeCfbd<GetLinesResponse>(() => getLines({ query })),
    teamAts: (query) =>
      executeCfbd<GetTeamsAtsResponse>(() => getTeamsAts({ query })),
    userInfo: () =>
      executeCfbd<GetUserInfoResponse>(() => getUserInfo()),
    records: (query) =>
      executeCfbd<GetRecordsResponse>(() => getRecords({ query })),
    calendar: (query) =>
      executeCfbd<GetCalendarResponse>(() => getCalendar({ query })),
    scoreboard: (query) =>
      executeCfbd<GetScoreboardResponse>(() => getScoreboard({ query })),
    advancedBoxScore: (query) =>
      executeCfbd<GetAdvancedBoxScoreResponse>(() => getAdvancedBoxScore({ query })),
  };
}

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

import type { CfbdApiContext } from "./context";

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

export function createReferenceCfbdApi(
  context: CfbdApiContext,
): ReferenceCfbdApi {
  return {
    teams: (query) =>
      context.execute<GetTeamsResponse>(() =>
        getTeams({ query, client: context.client }),
      ),
    matchup: (query) =>
      context.execute<GetMatchupResponse>(() =>
        getMatchup({ query, client: context.client }),
      ),
    conferences: () =>
      context.execute<GetConferencesResponse>(() =>
        getConferences({ client: context.client }),
      ),
    talent: (query) =>
      context.execute<GetTalentResponse>(() =>
        getTalent({ query, client: context.client }),
      ),
    venues: () =>
      context.execute<GetVenuesResponse>(() =>
        getVenues({ client: context.client }),
      ),
    playTypes: () =>
      context.execute<GetPlayTypesResponse>(() =>
        getPlayTypes({ client: context.client }),
      ),
    playStatTypes: () =>
      context.execute<GetPlayStatTypesResponse>(() =>
        getPlayStatTypes({ client: context.client }),
      ),
    cfpPlayoff: (query) =>
      context.execute<GetCfpPlayoffResponse>(() =>
        getCfpPlayoff({ query, client: context.client }),
      ),
    cfpParticipants: (query) =>
      context.execute<GetCfpParticipantsResponse>(() =>
        getCfpParticipants({ query, client: context.client }),
      ),
    cfpGames: (query) =>
      context.execute<GetCfpGamesResponse>(() =>
        getCfpGames({ query, client: context.client }),
      ),
    media: (query) =>
      context.execute<GetMediaResponse>(() =>
        getMedia({ query, client: context.client }),
      ),
    livePlays: (query) =>
      context.execute<GetLivePlaysResponse>(() =>
        getLivePlays({ query, client: context.client }),
      ),
    lines: (query) =>
      context.execute<GetLinesResponse>(() =>
        getLines({ query, client: context.client }),
      ),
    teamAts: (query) =>
      context.execute<GetTeamsAtsResponse>(() =>
        getTeamsAts({ query, client: context.client }),
      ),
    userInfo: () =>
      context.execute<GetUserInfoResponse>(() =>
        getUserInfo({ client: context.client }),
      ),
    records: (query) =>
      context.execute<GetRecordsResponse>(() =>
        getRecords({ query, client: context.client }),
      ),
    calendar: (query) =>
      context.execute<GetCalendarResponse>(() =>
        getCalendar({ query, client: context.client }),
      ),
    scoreboard: (query) =>
      context.execute<GetScoreboardResponse>(() =>
        getScoreboard({ query, client: context.client }),
      ),
    advancedBoxScore: (query) =>
      context.execute<GetAdvancedBoxScoreResponse>(() =>
        getAdvancedBoxScore({ query, client: context.client }),
      ),
  };
}

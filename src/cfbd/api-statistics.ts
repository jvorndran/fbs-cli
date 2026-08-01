import {
  getCategories,
  getFieldGoalExpectedPoints,
  getGameHavocStats,
  getPlayerGameSuccessRates,
  getPlayerSeasonOverview,
  getPlayerSeasonStats,
  getPlayerSeasonSuccessRates,
  getPredictedPoints,
  getPredictedPointsAddedByGame,
  getPredictedPointsAddedByPlayerGame,
  getPredictedPointsAddedByPlayerSeason,
  getPredictedPointsAddedByTeam,
  getPregameWinProbabilities,
  getReturningProduction,
  getTeamStats,
  getTransferPortal,
  getWinProbability,
  searchPlayers,
} from "cfbd";
import type {
  GetCategoriesResponse,
  GetFieldGoalExpectedPointsResponse,
  GetGameHavocStatsData,
  GetGameHavocStatsResponse,
  GetPlayerGameSuccessRatesData,
  GetPlayerGameSuccessRatesResponse,
  GetPlayerSeasonOverviewData,
  GetPlayerSeasonOverviewResponse,
  GetPlayerSeasonStatsData,
  GetPlayerSeasonStatsResponse,
  GetPlayerSeasonSuccessRatesData,
  GetPlayerSeasonSuccessRatesResponse,
  GetPredictedPointsAddedByGameData,
  GetPredictedPointsAddedByGameResponse,
  GetPredictedPointsAddedByPlayerGameData,
  GetPredictedPointsAddedByPlayerGameResponse,
  GetPredictedPointsAddedByPlayerSeasonData,
  GetPredictedPointsAddedByPlayerSeasonResponse,
  GetPredictedPointsAddedByTeamData,
  GetPredictedPointsAddedByTeamResponse,
  GetPredictedPointsData,
  GetPredictedPointsResponse,
  GetPregameWinProbabilitiesData,
  GetPregameWinProbabilitiesResponse,
  GetReturningProductionData,
  GetReturningProductionResponse,
  GetTeamStatsData,
  GetTeamStatsResponse,
  GetTransferPortalData,
  GetTransferPortalResponse,
  GetWinProbabilityData,
  GetWinProbabilityResponse,
  SearchPlayersData,
  SearchPlayersResponse,
} from "cfbd";

import { executeCfbd } from "./execute";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;

/** API methods owned by the statistics, player, PPA, and metrics command slice. */
export interface StatisticsCfbdApi {
  playerSeasonStats(
    query: QueryOf<GetPlayerSeasonStatsData>,
  ): Promise<GetPlayerSeasonStatsResponse>;
  playerSeasonSuccessRates(
    query: QueryOf<GetPlayerSeasonSuccessRatesData>,
  ): Promise<GetPlayerSeasonSuccessRatesResponse>;
  playerGameSuccessRates(
    query: QueryOf<GetPlayerGameSuccessRatesData>,
  ): Promise<GetPlayerGameSuccessRatesResponse>;
  teamSeasonStats(query: QueryOf<GetTeamStatsData>): Promise<GetTeamStatsResponse>;
  statCategories(): Promise<GetCategoriesResponse>;
  gameHavocStats(
    query: QueryOf<GetGameHavocStatsData>,
  ): Promise<GetGameHavocStatsResponse>;
  playerSearch(query: QueryOf<SearchPlayersData>): Promise<SearchPlayersResponse>;
  playerSeasonOverview(
    query: QueryOf<GetPlayerSeasonOverviewData>,
  ): Promise<GetPlayerSeasonOverviewResponse>;
  returningProduction(
    query: QueryOf<GetReturningProductionData>,
  ): Promise<GetReturningProductionResponse>;
  transferPortal(
    query: QueryOf<GetTransferPortalData>,
  ): Promise<GetTransferPortalResponse>;
  predictedPoints(
    query: QueryOf<GetPredictedPointsData>,
  ): Promise<GetPredictedPointsResponse>;
  teamPpa(
    query: QueryOf<GetPredictedPointsAddedByTeamData>,
  ): Promise<GetPredictedPointsAddedByTeamResponse>;
  gamePpa(
    query: QueryOf<GetPredictedPointsAddedByGameData>,
  ): Promise<GetPredictedPointsAddedByGameResponse>;
  playerGamePpa(
    query: QueryOf<GetPredictedPointsAddedByPlayerGameData>,
  ): Promise<GetPredictedPointsAddedByPlayerGameResponse>;
  playerSeasonPpa(
    query: QueryOf<GetPredictedPointsAddedByPlayerSeasonData>,
  ): Promise<GetPredictedPointsAddedByPlayerSeasonResponse>;
  winProbability(
    query: QueryOf<GetWinProbabilityData>,
  ): Promise<GetWinProbabilityResponse>;
  pregameWinProbabilities(
    query: QueryOf<GetPregameWinProbabilitiesData>,
  ): Promise<GetPregameWinProbabilitiesResponse>;
  fieldGoalExpectedPoints(): Promise<GetFieldGoalExpectedPointsResponse>;
}

/**
 * Build the adapter fragment that the root CFBD API factory spreads into its
 * single configured client. Client authentication remains owned by api.ts.
 */
export function createStatisticsCfbdApi(): StatisticsCfbdApi {
  return {
    playerSeasonStats: (query) =>
      executeCfbd<GetPlayerSeasonStatsResponse>(() => getPlayerSeasonStats({ query })),
    playerSeasonSuccessRates: (query) =>
      executeCfbd<GetPlayerSeasonSuccessRatesResponse>(() =>
        getPlayerSeasonSuccessRates({ query }),
      ),
    playerGameSuccessRates: (query) =>
      executeCfbd<GetPlayerGameSuccessRatesResponse>(() =>
        getPlayerGameSuccessRates({ query }),
      ),
    teamSeasonStats: (query) =>
      executeCfbd<GetTeamStatsResponse>(() => getTeamStats({ query })),
    statCategories: () =>
      executeCfbd<GetCategoriesResponse>(() => getCategories()),
    gameHavocStats: (query) =>
      executeCfbd<GetGameHavocStatsResponse>(() => getGameHavocStats({ query })),
    playerSearch: (query) =>
      executeCfbd<SearchPlayersResponse>(() => searchPlayers({ query })),
    playerSeasonOverview: (query) =>
      executeCfbd<GetPlayerSeasonOverviewResponse>(() =>
        getPlayerSeasonOverview({ query }),
      ),
    returningProduction: (query) =>
      executeCfbd<GetReturningProductionResponse>(() =>
        getReturningProduction({ query }),
      ),
    transferPortal: (query) =>
      executeCfbd<GetTransferPortalResponse>(() => getTransferPortal({ query })),
    predictedPoints: (query) =>
      executeCfbd<GetPredictedPointsResponse>(() => getPredictedPoints({ query })),
    teamPpa: (query) =>
      executeCfbd<GetPredictedPointsAddedByTeamResponse>(() =>
        getPredictedPointsAddedByTeam({ query }),
      ),
    gamePpa: (query) =>
      executeCfbd<GetPredictedPointsAddedByGameResponse>(() =>
        getPredictedPointsAddedByGame({ query }),
      ),
    playerGamePpa: (query) =>
      executeCfbd<GetPredictedPointsAddedByPlayerGameResponse>(() =>
        getPredictedPointsAddedByPlayerGame({ query }),
      ),
    playerSeasonPpa: (query) =>
      executeCfbd<GetPredictedPointsAddedByPlayerSeasonResponse>(() =>
        getPredictedPointsAddedByPlayerSeason({ query }),
      ),
    winProbability: (query) =>
      executeCfbd<GetWinProbabilityResponse>(() => getWinProbability({ query })),
    pregameWinProbabilities: (query) =>
      executeCfbd<GetPregameWinProbabilitiesResponse>(() =>
        getPregameWinProbabilities({ query }),
      ),
    fieldGoalExpectedPoints: () =>
      executeCfbd<GetFieldGoalExpectedPointsResponse>(() =>
        getFieldGoalExpectedPoints(),
      ),
  };
}

/** Narrow the shared runtime API while the root interface owns integration. */
export function asStatisticsCfbdApi(api: unknown): StatisticsCfbdApi {
  return api as StatisticsCfbdApi;
}

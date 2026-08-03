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

import type { CfbdApiContext } from "./context";

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
export function createStatisticsCfbdApi(
  context: CfbdApiContext,
): StatisticsCfbdApi {
  return {
    playerSeasonStats: (query) =>
      context.execute<GetPlayerSeasonStatsResponse>(() =>
        getPlayerSeasonStats({ query, client: context.client }),
      ),
    playerSeasonSuccessRates: (query) =>
      context.execute<GetPlayerSeasonSuccessRatesResponse>(() =>
        getPlayerSeasonSuccessRates({ query, client: context.client }),
      ),
    playerGameSuccessRates: (query) =>
      context.execute<GetPlayerGameSuccessRatesResponse>(() =>
        getPlayerGameSuccessRates({ query, client: context.client }),
      ),
    teamSeasonStats: (query) =>
      context.execute<GetTeamStatsResponse>(() =>
        getTeamStats({ query, client: context.client }),
      ),
    statCategories: () =>
      context.execute<GetCategoriesResponse>(() =>
        getCategories({ client: context.client }),
      ),
    gameHavocStats: (query) =>
      context.execute<GetGameHavocStatsResponse>(() =>
        getGameHavocStats({ query, client: context.client }),
      ),
    playerSearch: (query) =>
      context.execute<SearchPlayersResponse>(() =>
        searchPlayers({ query, client: context.client }),
      ),
    playerSeasonOverview: (query) =>
      context.execute<GetPlayerSeasonOverviewResponse>(() =>
        getPlayerSeasonOverview({ query, client: context.client }),
      ),
    returningProduction: (query) =>
      context.execute<GetReturningProductionResponse>(() =>
        getReturningProduction({ query, client: context.client }),
      ),
    transferPortal: (query) =>
      context.execute<GetTransferPortalResponse>(() =>
        getTransferPortal({ query, client: context.client }),
      ),
    predictedPoints: (query) =>
      context.execute<GetPredictedPointsResponse>(() =>
        getPredictedPoints({ query, client: context.client }),
      ),
    teamPpa: (query) =>
      context.execute<GetPredictedPointsAddedByTeamResponse>(() =>
        getPredictedPointsAddedByTeam({ query, client: context.client }),
      ),
    gamePpa: (query) =>
      context.execute<GetPredictedPointsAddedByGameResponse>(() =>
        getPredictedPointsAddedByGame({ query, client: context.client }),
      ),
    playerGamePpa: (query) =>
      context.execute<GetPredictedPointsAddedByPlayerGameResponse>(() =>
        getPredictedPointsAddedByPlayerGame({ query, client: context.client }),
      ),
    playerSeasonPpa: (query) =>
      context.execute<GetPredictedPointsAddedByPlayerSeasonResponse>(() =>
        getPredictedPointsAddedByPlayerSeason({
          query,
          client: context.client,
        }),
      ),
    winProbability: (query) =>
      context.execute<GetWinProbabilityResponse>(() =>
        getWinProbability({ query, client: context.client }),
      ),
    pregameWinProbabilities: (query) =>
      context.execute<GetPregameWinProbabilitiesResponse>(() =>
        getPregameWinProbabilities({ query, client: context.client }),
      ),
    fieldGoalExpectedPoints: () =>
      context.execute<GetFieldGoalExpectedPointsResponse>(() =>
        getFieldGoalExpectedPoints({ client: context.client }),
      ),
  };
}

/** Narrow the shared runtime API while the root interface owns integration. */
export function asStatisticsCfbdApi(api: unknown): StatisticsCfbdApi {
  return api as StatisticsCfbdApi;
}

import {
  getAdvancedGameStats,
  getAdvancedSeasonStats,
  getDrives,
  getFbsTeams,
  getGamePlayerStats,
  getGames,
  getGameTeamStats,
  getPlayStats,
  getPlayerUsage,
  getPlays,
  getRoster,
  getUsage,
  getWeather,
} from "cfbd";
import type {
  GetAdvancedGameStatsData,
  GetAdvancedGameStatsResponse,
  GetAdvancedSeasonStatsData,
  GetAdvancedSeasonStatsResponse,
  GetDrivesData,
  GetDrivesResponse,
  GetFbsTeamsData,
  GetFbsTeamsResponse,
  GetGamePlayerStatsData,
  GetGamePlayerStatsResponse,
  GetGamesData,
  GetGamesResponse,
  GetGameTeamStatsData,
  GetGameTeamStatsResponse,
  GetPlayStatsData,
  GetPlayStatsResponse,
  GetPlayerUsageData,
  GetPlayerUsageResponse,
  GetPlaysData,
  GetPlaysResponse,
  GetRosterData,
  GetRosterResponse,
  GetUsageData,
  GetUsageResponse,
  GetWeatherData,
  GetWeatherResponse,
} from "cfbd";

import { normalizeConfiguredApiKey } from "../auth/api-key";
import {
  createConfiguredCfbdClient,
  type CreateCfbdClientOptions,
} from "./client";
import { createCfbdApiContext } from "./context";
import {
  createAnalyticsCfbdApi,
  type AnalyticsCfbdApi,
} from "./api-analytics";
import {
  createReferenceCfbdApi,
  type ReferenceCfbdApi,
} from "./api-reference";
import {
  createStatisticsCfbdApi,
  type StatisticsCfbdApi,
} from "./api-statistics";

type QueryOf<T extends { query?: unknown }> = NonNullable<T["query"]>;

export interface CfbdApi
  extends ReferenceCfbdApi,
    StatisticsCfbdApi,
    AnalyticsCfbdApi {
  fbsTeams(query: QueryOf<GetFbsTeamsData>): Promise<GetFbsTeamsResponse>;
  games(query: QueryOf<GetGamesData>): Promise<GetGamesResponse>;
  roster(query: QueryOf<GetRosterData>): Promise<GetRosterResponse>;
  usage(query: QueryOf<GetUsageData>): Promise<GetUsageResponse>;
  gameTeamStats(query: QueryOf<GetGameTeamStatsData>): Promise<GetGameTeamStatsResponse>;
  gamePlayerStats(query: QueryOf<GetGamePlayerStatsData>): Promise<GetGamePlayerStatsResponse>;
  drives(query: QueryOf<GetDrivesData>): Promise<GetDrivesResponse>;
  plays(query: QueryOf<GetPlaysData>): Promise<GetPlaysResponse>;
  playStats(query: QueryOf<GetPlayStatsData>): Promise<GetPlayStatsResponse>;
  advancedGameStats(query: QueryOf<GetAdvancedGameStatsData>): Promise<GetAdvancedGameStatsResponse>;
  playerUsage(query: QueryOf<GetPlayerUsageData>): Promise<GetPlayerUsageResponse>;
  advancedSeasonStats(query: QueryOf<GetAdvancedSeasonStatsData>): Promise<GetAdvancedSeasonStatsResponse>;
  weather(query: QueryOf<GetWeatherData>): Promise<GetWeatherResponse>;
}

export type CreateCfbdApiOptions = CreateCfbdClientOptions;

export function createCfbdApi(
  apiKey: string,
  options: CreateCfbdApiOptions = {},
): CfbdApi {
  const validatedApiKey = normalizeConfiguredApiKey(apiKey, "environment");
  const client = createConfiguredCfbdClient(validatedApiKey, options);
  const context = createCfbdApiContext(client, validatedApiKey);

  return {
    ...createReferenceCfbdApi(context),
    ...createStatisticsCfbdApi(context),
    ...createAnalyticsCfbdApi(context),
    fbsTeams: (query) =>
      context.execute<GetFbsTeamsResponse>(() =>
        getFbsTeams({ query, client: context.client }),
      ),
    games: (query) =>
      context.execute<GetGamesResponse>(() =>
        getGames({ query, client: context.client }),
      ),
    roster: (query) =>
      context.execute<GetRosterResponse>(() =>
        getRoster({ query, client: context.client }),
      ),
    usage: (query) =>
      context.execute<GetUsageResponse>(() =>
        getUsage({ query, client: context.client }),
      ),
    gameTeamStats: (query) =>
      context.execute<GetGameTeamStatsResponse>(() =>
        getGameTeamStats({ query, client: context.client }),
      ),
    gamePlayerStats: (query) =>
      context.execute<GetGamePlayerStatsResponse>(() =>
        getGamePlayerStats({ query, client: context.client }),
      ),
    drives: (query) =>
      context.execute<GetDrivesResponse>(() =>
        getDrives({ query, client: context.client }),
      ),
    plays: (query) =>
      context.execute<GetPlaysResponse>(() =>
        getPlays({ query, client: context.client }),
      ),
    playStats: (query) =>
      context.execute<GetPlayStatsResponse>(() =>
        getPlayStats({ query, client: context.client }),
      ),
    advancedGameStats: (query) =>
      context.execute<GetAdvancedGameStatsResponse>(() =>
        getAdvancedGameStats({ query, client: context.client }),
      ),
    playerUsage: (query) =>
      context.execute<GetPlayerUsageResponse>(() =>
        getPlayerUsage({ query, client: context.client }),
      ),
    advancedSeasonStats: (query) =>
      context.execute<GetAdvancedSeasonStatsResponse>(() =>
        getAdvancedSeasonStats({ query, client: context.client }),
      ),
    weather: (query) =>
      context.execute<GetWeatherResponse>(() =>
        getWeather({ query, client: context.client }),
      ),
  };
}

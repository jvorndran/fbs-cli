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

import { configureCfbdClient } from "./client";
import { executeCfbd } from "./execute";
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

export function createCfbdApi(apiKey: string): CfbdApi {
  configureCfbdClient(apiKey);

  return {
    ...createReferenceCfbdApi(),
    ...createStatisticsCfbdApi(),
    ...createAnalyticsCfbdApi(),
    fbsTeams: (query) =>
      executeCfbd<GetFbsTeamsResponse>(() => getFbsTeams({ query })),
    games: (query) =>
      executeCfbd<GetGamesResponse>(() => getGames({ query })),
    roster: (query) =>
      executeCfbd<GetRosterResponse>(() => getRoster({ query })),
    usage: (query) =>
      executeCfbd<GetUsageResponse>(() => getUsage({ query })),
    gameTeamStats: (query) =>
      executeCfbd<GetGameTeamStatsResponse>(() => getGameTeamStats({ query })),
    gamePlayerStats: (query) =>
      executeCfbd<GetGamePlayerStatsResponse>(() => getGamePlayerStats({ query })),
    drives: (query) =>
      executeCfbd<GetDrivesResponse>(() => getDrives({ query })),
    plays: (query) =>
      executeCfbd<GetPlaysResponse>(() => getPlays({ query })),
    playStats: (query) =>
      executeCfbd<GetPlayStatsResponse>(() => getPlayStats({ query })),
    advancedGameStats: (query) =>
      executeCfbd<GetAdvancedGameStatsResponse>(() => getAdvancedGameStats({ query })),
    playerUsage: (query) =>
      executeCfbd<GetPlayerUsageResponse>(() => getPlayerUsage({ query })),
    advancedSeasonStats: (query) =>
      executeCfbd<GetAdvancedSeasonStatsResponse>(() => getAdvancedSeasonStats({ query })),
    weather: (query) =>
      executeCfbd<GetWeatherResponse>(() => getWeather({ query })),
  };
}

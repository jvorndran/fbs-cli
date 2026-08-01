import type { CfbdApi } from "../../src/cfbd/api.ts";
import { loadFixture } from "./fixture.ts";

export interface RecordedApiCall {
  method: keyof CfbdApi;
  query: Record<string, unknown>;
}

type ApiResponse<K extends keyof CfbdApi> = Awaited<ReturnType<CfbdApi[K]>>;

export interface MockApi {
  api: CfbdApi;
  calls: RecordedApiCall[];
}

export async function createMockApi(
  overrides: Partial<CfbdApi> = {},
): Promise<MockApi> {
  const [
    teams,
    games,
    roster,
    usage,
    gameTeamStats,
    gamePlayerStats,
    drives,
    plays,
    playStats,
    advancedGameStats,
    playerUsage,
    advancedSeasonStats,
    weather,
  ] = await Promise.all([
    loadFixture<ApiResponse<"fbsTeams">>("teams"),
    loadFixture<ApiResponse<"games">>("games"),
    loadFixture<ApiResponse<"roster">>("roster"),
    loadFixture<ApiResponse<"usage">>("usage"),
    loadFixture<ApiResponse<"gameTeamStats">>("team-game-stats"),
    loadFixture<ApiResponse<"gamePlayerStats">>("player-game-stats"),
    loadFixture<ApiResponse<"drives">>("drives"),
    loadFixture<ApiResponse<"plays">>("plays"),
    loadFixture<ApiResponse<"playStats">>("play-stats"),
    loadFixture<ApiResponse<"advancedGameStats">>("advanced-game-stats"),
    loadFixture<ApiResponse<"playerUsage">>("player-usage"),
    loadFixture<ApiResponse<"advancedSeasonStats">>("advanced-season-stats"),
    loadFixture<ApiResponse<"weather">>("weather"),
  ]);

  const calls: RecordedApiCall[] = [];
  const record = (method: keyof CfbdApi, query: object): void => {
    calls.push({ method, query: { ...query } });
  };

  const handlers: Partial<CfbdApi> = {
    async fbsTeams(query) {
      record("fbsTeams", query);
      return teams;
    },
    async games(query) {
      record("games", query);
      return games;
    },
    async roster(query) {
      record("roster", query);
      return roster;
    },
    async usage(query) {
      record("usage", query);
      return usage;
    },
    async gameTeamStats(query) {
      record("gameTeamStats", query);
      return gameTeamStats;
    },
    async gamePlayerStats(query) {
      record("gamePlayerStats", query);
      return gamePlayerStats;
    },
    async drives(query) {
      record("drives", query);
      return drives;
    },
    async plays(query) {
      record("plays", query);
      return plays;
    },
    async playStats(query) {
      record("playStats", query);
      return playStats;
    },
    async advancedGameStats(query) {
      record("advancedGameStats", query);
      return advancedGameStats;
    },
    async playerUsage(query) {
      record("playerUsage", query);
      return playerUsage;
    },
    async advancedSeasonStats(query) {
      record("advancedSeasonStats", query);
      return advancedSeasonStats;
    },
    async weather(query) {
      record("weather", query);
      return weather;
    },
    ...overrides,
  };

  const api = new Proxy(handlers as Record<PropertyKey, unknown>, {
    get(target, property, receiver) {
      const handler = Reflect.get(target, property, receiver);
      if (handler !== undefined) return handler;

      if (typeof property !== "string") return undefined;

      return async (query: object = {}) => {
        record(property as keyof CfbdApi, query);
        return [];
      };
    },
  }) as unknown as CfbdApi;

  return { api, calls };
}

import { describe, expect, test } from "bun:test";
import * as cfbd from "cfbd";

import { createCfbdApi, type CfbdApi } from "../src/cfbd/api.ts";

const SUPPORTED_ENDPOINTS = {
  getAdjustedTeamSeasonStats: "wepaTeamSeason",
  getAdjustedPlayerPassingStats: "wepaPassing",
  getAdjustedPlayerRushingStats: "wepaRushing",
  getKickerPaar: "wepaKicking",
  getTeams: "teams",
  getFbsTeams: "fbsTeams",
  getMatchup: "matchup",
  getTeamsAts: "teamAts",
  getRoster: "roster",
  getConferences: "conferences",
  getTalent: "talent",
  getVenues: "venues",
  getPlayerSeasonStats: "playerSeasonStats",
  getPlayerSeasonSuccessRates: "playerSeasonSuccessRates",
  getPlayerGameSuccessRates: "playerGameSuccessRates",
  getTeamStats: "teamSeasonStats",
  getCategories: "statCategories",
  getAdvancedSeasonStats: "advancedSeasonStats",
  getAdvancedGameStats: "advancedGameStats",
  getGameHavocStats: "gameHavocStats",
  getRecruits: "recruitingPlayers",
  getTeamRecruitingRankings: "recruitingTeams",
  getAggregatedTeamRecruitingRatings: "recruitingGroups",
  getSp: "spRatings",
  getConferenceSp: "conferenceSpRatings",
  getSrs: "srsRatings",
  getExpandedSrs: "expandedSrsRatings",
  getElo: "eloRatings",
  getFpi: "fpiRatings",
  getRankings: "rankings",
  getPlays: "plays",
  getPlayTypes: "playTypes",
  getPlayStats: "playStats",
  getPlayStatTypes: "playStatTypes",
  getCfpPlayoff: "cfpPlayoff",
  getCfpParticipants: "cfpParticipants",
  getCfpGames: "cfpGames",
  searchPlayers: "playerSearch",
  getPlayerUsage: "playerUsage",
  getPlayerSeasonOverview: "playerSeasonOverview",
  getReturningProduction: "returningProduction",
  getTransferPortal: "transferPortal",
  getPredictedPoints: "predictedPoints",
  getPredictedPointsAddedByTeam: "teamPpa",
  getPredictedPointsAddedByGame: "gamePpa",
  getPredictedPointsAddedByPlayerGame: "playerGamePpa",
  getPredictedPointsAddedByPlayerSeason: "playerSeasonPpa",
  getWinProbability: "winProbability",
  getPregameWinProbabilities: "pregameWinProbabilities",
  getFieldGoalExpectedPoints: "fieldGoalExpectedPoints",
  getLivePlays: "livePlays",
  getLines: "lines",
  getUserInfo: "userInfo",
  getUsage: "usage",
  getGames: "games",
  getGameTeamStats: "gameTeamStats",
  getGamePlayerStats: "gamePlayerStats",
  getMedia: "media",
  getWeather: "weather",
  getRecords: "records",
  getCalendar: "calendar",
  getScoreboard: "scoreboard",
  getDrives: "drives",
  getDraftTeams: "draftTeams",
  getDraftPositions: "draftPositions",
  getDraftPicks: "draftPicks",
  getCoaches: "coaches",
  getCoachProfile: "coachProfile",
  getCoachSeasons: "coachSeasons",
  getCoachTenures: "coachTenures",
  getAdvancedBoxScore: "advancedBoxScore",
} as const satisfies Record<string, keyof CfbdApi>;

describe("pinned cfbd endpoint coverage", () => {
  test("maps every generated GET operation to one unique API adapter method", () => {
    const sdk = cfbd as unknown as Record<string, unknown>;
    const api = createCfbdApi("offline-coverage-test");
    const mappings = Object.entries(SUPPORTED_ENDPOINTS);

    expect(mappings).toHaveLength(71);
    expect(new Set(mappings.map(([, method]) => method)).size).toBe(71);
    expect(Object.keys(api)).toHaveLength(71);

    for (const [sdkFunction, adapterMethod] of mappings) {
      expect(typeof sdk[sdkFunction]).toBe("function");
      expect(typeof api[adapterMethod]).toBe("function");
    }
  });

  test("matches the complete generated GET operation surface", () => {
    const sdk = cfbd as unknown as Record<string, unknown>;
    const generatedOperations = Object.keys(sdk)
      .filter(
        (name) =>
          typeof sdk[name] === "function" &&
          (name.startsWith("get") || name === "searchPlayers"),
      )
      .sort();
    const expectedOperations = Object.keys(SUPPORTED_ENDPOINTS).sort();

    expect(generatedOperations).toEqual(expectedOperations);
    expect(createCfbdApi("offline-coverage-test")).toHaveProperty("lines");
    expect(createCfbdApi("offline-coverage-test")).toHaveProperty("teamAts");
  });
});

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

const EXPECTED_HTTP_PATHS = {
  wepaTeamSeason: "/wepa/team/season",
  wepaPassing: "/wepa/players/passing",
  wepaRushing: "/wepa/players/rushing",
  wepaKicking: "/wepa/players/kicking",
  teams: "/teams",
  fbsTeams: "/teams/fbs",
  matchup: "/teams/matchup",
  teamAts: "/teams/ats",
  roster: "/roster",
  conferences: "/conferences",
  talent: "/talent",
  venues: "/venues",
  playerSeasonStats: "/stats/player/season",
  playerSeasonSuccessRates: "/stats/player/success",
  playerGameSuccessRates: "/stats/player/success/game",
  teamSeasonStats: "/stats/season",
  statCategories: "/stats/categories",
  advancedSeasonStats: "/stats/season/advanced",
  advancedGameStats: "/stats/game/advanced",
  gameHavocStats: "/stats/game/havoc",
  recruitingPlayers: "/recruiting/players",
  recruitingTeams: "/recruiting/teams",
  recruitingGroups: "/recruiting/groups",
  spRatings: "/ratings/sp",
  conferenceSpRatings: "/ratings/sp/conferences",
  srsRatings: "/ratings/srs",
  expandedSrsRatings: "/ratings/srs/expanded",
  eloRatings: "/ratings/elo",
  fpiRatings: "/ratings/fpi",
  rankings: "/rankings",
  plays: "/plays",
  playTypes: "/plays/types",
  playStats: "/plays/stats",
  playStatTypes: "/plays/stats/types",
  cfpPlayoff: "/playoffs/cfp",
  cfpParticipants: "/playoffs/cfp/participants",
  cfpGames: "/playoffs/cfp/games",
  playerSearch: "/player/search",
  playerUsage: "/player/usage",
  playerSeasonOverview: "/player/season/overview",
  returningProduction: "/player/returning",
  transferPortal: "/player/portal",
  predictedPoints: "/ppa/predicted",
  teamPpa: "/ppa/teams",
  gamePpa: "/ppa/games",
  playerGamePpa: "/ppa/players/games",
  playerSeasonPpa: "/ppa/players/season",
  winProbability: "/metrics/wp",
  pregameWinProbabilities: "/metrics/wp/pregame",
  fieldGoalExpectedPoints: "/metrics/fg/ep",
  livePlays: "/live/plays",
  lines: "/lines",
  userInfo: "/info",
  usage: "/info/usage",
  games: "/games",
  gameTeamStats: "/games/teams",
  gamePlayerStats: "/games/players",
  media: "/games/media",
  weather: "/games/weather",
  records: "/records",
  calendar: "/calendar",
  scoreboard: "/scoreboard",
  drives: "/drives",
  draftTeams: "/draft/teams",
  draftPositions: "/draft/positions",
  draftPicks: "/draft/picks",
  coaches: "/coaches",
  coachProfile: "/coaches/profile",
  coachSeasons: "/coaches/seasons",
  coachTenures: "/coaches/tenures",
  advancedBoxScore: "/game/box/advanced",
} as const satisfies Record<keyof CfbdApi, string>;

type QueryMethod = {
  [Method in keyof CfbdApi]: Parameters<CfbdApi[Method]> extends []
    ? never
    : Method;
}[keyof CfbdApi];

type QueryFixtures = {
  [Method in QueryMethod]: {
    query: Parameters<CfbdApi[Method]>[0];
    search: `?${string}`;
  };
};

const REPRESENTATIVE_QUERIES = {
  wepaTeamSeason: {
    query: { conference: "ACC" },
    search: "?conference=ACC",
  },
  wepaPassing: { query: { position: "QB" }, search: "?position=QB" },
  wepaRushing: {
    query: { team: "Florida State" },
    search: "?team=Florida%20State",
  },
  wepaKicking: { query: { year: 2026 }, search: "?year=2026" },
  teams: { query: { conference: "ACC" }, search: "?conference=ACC" },
  fbsTeams: { query: { year: 2026 }, search: "?year=2026" },
  matchup: {
    query: { team1: "Florida State", team2: "Miami" },
    search: "?team1=Florida%20State&team2=Miami",
  },
  teamAts: { query: { year: 2026 }, search: "?year=2026" },
  roster: { query: { classification: "fbs" }, search: "?classification=fbs" },
  talent: { query: { year: 2026 }, search: "?year=2026" },
  playerSeasonStats: { query: { year: 2026 }, search: "?year=2026" },
  playerSeasonSuccessRates: {
    query: { playerId: 42, excludeGarbageTime: true },
    search: "?playerId=42&excludeGarbageTime=true",
  },
  playerGameSuccessRates: {
    query: { year: 2026, week: 0 },
    search: "?year=2026&week=0",
  },
  teamSeasonStats: {
    query: { team: "Florida State" },
    search: "?team=Florida%20State",
  },
  advancedSeasonStats: {
    query: { year: 2026, excludeGarbageTime: false },
    search: "?year=2026&excludeGarbageTime=false",
  },
  advancedGameStats: {
    query: { opponent: "Miami" },
    search: "?opponent=Miami",
  },
  gameHavocStats: {
    query: { team: "Florida State", seasonType: "regular" },
    search: "?team=Florida%20State&seasonType=regular",
  },
  recruitingPlayers: {
    query: { year: 2026, classification: "HighSchool" },
    search: "?year=2026&classification=HighSchool",
  },
  recruitingTeams: {
    query: { team: "Florida State" },
    search: "?team=Florida%20State",
  },
  recruitingGroups: {
    query: { recruitType: "HighSchool" },
    search: "?recruitType=HighSchool",
  },
  spRatings: { query: { year: 2026 }, search: "?year=2026" },
  conferenceSpRatings: {
    query: { classification: "fbs" },
    search: "?classification=fbs",
  },
  srsRatings: { query: { conference: "ACC" }, search: "?conference=ACC" },
  expandedSrsRatings: {
    query: { team: "Florida State", classification: "fbs" },
    search: "?team=Florida%20State&classification=fbs",
  },
  eloRatings: {
    query: { seasonType: "postseason" },
    search: "?seasonType=postseason",
  },
  fpiRatings: {
    query: { team: "Florida State" },
    search: "?team=Florida%20State",
  },
  rankings: {
    query: { year: 2026, latest: true },
    search: "?year=2026&latest=true",
  },
  plays: {
    query: { year: 2026, week: 1, playType: "Rush" },
    search: "?year=2026&week=1&playType=Rush",
  },
  playStats: { query: { gameId: 401 }, search: "?gameId=401" },
  cfpPlayoff: { query: { year: 2026 }, search: "?year=2026" },
  cfpParticipants: { query: { year: 2026 }, search: "?year=2026" },
  cfpGames: {
    query: { year: 2026, round: "semifinal" },
    search: "?year=2026&round=semifinal",
  },
  playerSearch: {
    query: { searchTerm: "Jordan Travis" },
    search: "?searchTerm=Jordan%20Travis",
  },
  playerUsage: {
    query: { year: 2026, playerId: 42 },
    search: "?year=2026&playerId=42",
  },
  playerSeasonOverview: {
    query: { year: 2026, playerId: 42 },
    search: "?year=2026&playerId=42",
  },
  returningProduction: {
    query: { conference: "ACC" },
    search: "?conference=ACC",
  },
  transferPortal: { query: { year: 2026 }, search: "?year=2026" },
  predictedPoints: {
    query: { down: 4, distance: 0 },
    search: "?down=4&distance=0",
  },
  teamPpa: {
    query: { team: "Florida State", excludeGarbageTime: true },
    search: "?team=Florida%20State&excludeGarbageTime=true",
  },
  gamePpa: {
    query: { year: 2026, week: 0 },
    search: "?year=2026&week=0",
  },
  playerGamePpa: {
    query: { year: 2026, team: "Florida State" },
    search: "?year=2026&team=Florida%20State",
  },
  playerSeasonPpa: {
    query: { playerId: "player-42" },
    search: "?playerId=player-42",
  },
  winProbability: { query: { gameId: 401 }, search: "?gameId=401" },
  pregameWinProbabilities: {
    query: { seasonType: "regular" },
    search: "?seasonType=regular",
  },
  livePlays: { query: { gameId: 401 }, search: "?gameId=401" },
  lines: {
    query: { provider: "Draft Kings" },
    search: "?provider=Draft%20Kings",
  },
  usage: { query: { api: "cfb", days: 7 }, search: "?api=cfb&days=7" },
  games: {
    query: { id: 401, classification: "fbs" },
    search: "?id=401&classification=fbs",
  },
  gameTeamStats: { query: { id: 401 }, search: "?id=401" },
  gamePlayerStats: {
    query: { id: 401, category: "passing" },
    search: "?id=401&category=passing",
  },
  media: {
    query: { year: 2026, mediaType: "tv" },
    search: "?year=2026&mediaType=tv",
  },
  weather: { query: { gameId: 401 }, search: "?gameId=401" },
  records: {
    query: { team: "Florida State" },
    search: "?team=Florida%20State",
  },
  calendar: { query: { year: 2026 }, search: "?year=2026" },
  scoreboard: {
    query: { classification: "fbs" },
    search: "?classification=fbs",
  },
  drives: {
    query: { year: 2026, offenseConference: "ACC" },
    search: "?year=2026&offenseConference=ACC",
  },
  draftPicks: {
    query: { school: "Florida State" },
    search: "?school=Florida%20State",
  },
  coaches: { query: { firstName: "Mike" }, search: "?firstName=Mike" },
  coachProfile: { query: { coachId: 42 }, search: "?coachId=42" },
  coachSeasons: { query: { minYear: 2020 }, search: "?minYear=2020" },
  coachTenures: { query: { active: false }, search: "?active=false" },
  advancedBoxScore: { query: { id: 401 }, search: "?id=401" },
} as const satisfies QueryFixtures;

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

  test("sends every adapter through its private client to the expected GET path", async () => {
    const apiKey = "offline-http-boundary-test";
    const requests: Request[] = [];
    const api = createCfbdApi(apiKey, {
      fetch: async (request) => {
        requests.push(request);
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    const endpoints = Object.entries(EXPECTED_HTTP_PATHS) as Array<
      [keyof CfbdApi, string]
    >;

    expect(endpoints).toHaveLength(71);
    expect(new Set(endpoints.map(([method]) => method))).toEqual(
      new Set(Object.values(SUPPORTED_ENDPOINTS)),
    );
    expect(Object.keys(REPRESENTATIVE_QUERIES)).toHaveLength(62);

    const queryFixtures = REPRESENTATIVE_QUERIES as Partial<
      Record<keyof CfbdApi, { query: unknown; search: string }>
    >;

    for (const [method, expectedPath] of endpoints) {
      const requestCount = requests.length;
      const invoke = api[method] as (query?: unknown) => Promise<unknown>;
      const queryFixture = queryFixtures[method];

      if (queryFixture) {
        await invoke(queryFixture.query);
      } else {
        await invoke();
      }

      expect(requests).toHaveLength(requestCount + 1);
      const request = requests[requestCount]!;
      const url = new URL(request.url);
      expect(request.method).toBe("GET");
      expect(url.origin).toBe("https://api.collegefootballdata.com");
      expect(url.pathname).toBe(expectedPath);
      expect(url.search).toBe(queryFixture?.search ?? "");
      expect(request.headers.get("authorization")).toBe(`Bearer ${apiKey}`);
    }
  });
});

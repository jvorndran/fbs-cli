import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import { parse } from "yaml";
import type {
  AdvancedBoxScore,
  BettingGame,
  CalendarWeek,
  CfpPlayoff,
  Conference,
  GameMedia,
  LiveGame,
  Matchup,
  PlayoffMatchup,
  PlayoffParticipant,
  PlayStatType,
  PlayType,
  ScoreboardGame,
  TeamRecords,
  TeamATS,
  TeamTalent,
  UserInfo,
  Venue,
} from "cfbd";

import { createReferenceCfbdApi } from "../src/cfbd/api-reference.ts";
import type { CfbdApi } from "../src/cfbd/api.ts";
import {
  buildAdvancedBoxScoreQuery,
  buildCalendarQuery,
  buildCfpGamesQuery,
  buildCfpParticipantsQuery,
  buildCfpPlayoffQuery,
  buildLivePlaysQuery,
  buildLinesQuery,
  buildMatchupQuery,
  buildMediaQuery,
  buildNoQuery,
  buildRecordsQuery,
  buildScoreboardQuery,
  buildTalentQuery,
  buildTeamAtsQuery,
  buildTeamsQuery,
  validateAdvancedBoxScoreQuery,
  validateCalendarQuery,
  validateCfpGamesQuery,
  validateCfpParticipantsQuery,
  validateCfpPlayoffQuery,
  validateLivePlaysQuery,
  validateLinesQuery,
  validateMatchupQuery,
  validateMediaQuery,
  validateNoQuery,
  validateRecordsQuery,
  validateScoreboardQuery,
  validateTalentQuery,
  validateTeamAtsQuery,
  validateTeamsQuery,
} from "../src/cfbd/query-builders-reference.ts";
import {
  transformAdvancedBoxScore,
  transformCalendar,
  transformCfpGames,
  transformCfpParticipants,
  transformCfpPlayoff,
  transformConferences,
  transformGameMedia,
  transformLivePlays,
  transformLines,
  transformMatchup,
  transformPlayStatTypes,
  transformPlayTypes,
  transformRecords,
  transformScoreboard,
  transformTalent,
  transformTeamAts,
  transformUserInfo,
  transformVenues,
} from "../src/transformers/reference-endpoints.ts";
import { registerGameCommand } from "../src/commands/game.ts";
import { registerGamesCommand } from "../src/commands/games.ts";
import { registerInfoCommand } from "../src/commands/info.ts";
import { registerLiveCommand } from "../src/commands/live.ts";
import { registerLinesCommand } from "../src/commands/lines.ts";
import { registerPlayoffsCommand } from "../src/commands/playoffs.ts";
import { registerPlaysCommand } from "../src/commands/plays.ts";
import { registerReferenceCommands } from "../src/commands/reference.ts";
import { registerTeamsCommand } from "../src/commands/teams.ts";
import type { CommandRuntime } from "../src/runtime.ts";
import { snakeCaseDeep } from "../src/utils/snake-case.ts";

interface RecordedReferenceCall {
  method: string;
  query: Record<string, unknown>;
}

function referenceResponse(method: string): unknown {
  if (method === "matchup") {
    return {
      team1: "Florida State",
      team2: "Miami",
      team1Wins: 1,
      team2Wins: 0,
      ties: 0,
      games: [],
    } satisfies Matchup;
  }
  if (method === "cfpPlayoff") {
    return {
      season: 2025,
      competition: "cfp",
      format: "12-team",
      teamCount: 12,
      status: "scheduled",
      participants: [],
      rounds: [],
      champion: null,
    } satisfies CfpPlayoff;
  }
  if (method === "livePlays") {
    return {
      id: 1,
      status: "scheduled",
      period: null,
      clock: "15:00",
      possession: "",
      down: null,
      distance: null,
      yardsToGoal: null,
      teams: [],
      drives: [],
    } satisfies LiveGame;
  }
  if (method === "userInfo") return null;
  if (method === "advancedBoxScore") {
    return {
      gameInfo: {
        excitement: 0,
        homeWinner: false,
        awayWinProb: 0.5,
        awayPoints: 0,
        awayTeam: "Alabama",
        homeWinProb: 0.5,
        homePoints: 0,
        homeTeam: "Florida State",
      },
      teams: {
        fieldPosition: [],
        scoringOpportunities: [],
        havoc: [],
        rushing: [],
        explosiveness: [],
        successRates: [],
        cumulativePpa: [],
        ppa: [],
      },
      players: { ppa: [], usage: [] },
    } satisfies AdvancedBoxScore;
  }
  return [];
}

async function invokeReferenceRoute(argv: readonly string[]): Promise<{
  output: Record<string, unknown>;
  calls: RecordedReferenceCall[];
}> {
  const calls: RecordedReferenceCall[] = [];
  const api = new Proxy<Record<string, unknown>>(
    {},
    {
      get: (_target, property) => async (query?: Record<string, unknown>) => {
        const method = String(property);
        calls.push({ method, query: query ?? {} });
        return referenceResponse(method);
      },
    },
  ) as unknown as CfbdApi;
  let stdout = "";
  const runtime: CommandRuntime = {
    getApi: () => api,
    io: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: () => undefined,
    },
  };
  const program = new Command()
    .name("fbs")
    .exitOverride()
    .enablePositionalOptions();
  registerTeamsCommand(program, runtime);
  registerGamesCommand(program, runtime);
  registerInfoCommand(program, runtime);
  registerPlaysCommand(program, runtime);
  registerReferenceCommands(program, runtime);
  registerPlayoffsCommand(program, runtime);
  registerLiveCommand(program, runtime);
  registerLinesCommand(program, runtime);
  registerGameCommand(program, runtime);

  await program.parseAsync([...argv], { from: "user" });
  return { output: parse(stdout) as Record<string, unknown>, calls };
}

describe("reference command registrations", () => {
  const cases: Array<{
    argv: readonly string[];
    command: string;
    endpoint: string;
    method: string;
    query: Record<string, unknown>;
    resultKey: string;
  }> = [
    { argv: ["teams"], command: "teams", endpoint: "/teams", method: "teams", query: {}, resultKey: "teams" },
    { argv: ["teams", "matchup", "--team1", "Florida State", "--team2", "Miami"], command: "teams matchup", endpoint: "/teams/matchup", method: "matchup", query: { team1: "Florida State", team2: "Miami" }, resultKey: "matchup" },
    { argv: ["teams", "ats", "--year", "2024", "--team", "Florida State"], command: "teams ats", endpoint: "/teams/ats", method: "teamAts", query: { team: "Florida State", year: 2024 }, resultKey: "team_ats" },
    { argv: ["conferences"], command: "conferences", endpoint: "/conferences", method: "conferences", query: {}, resultKey: "conferences" },
    { argv: ["talent", "--year", "2026"], command: "talent", endpoint: "/talent", method: "talent", query: { year: 2026 }, resultKey: "talent" },
    { argv: ["venues"], command: "venues", endpoint: "/venues", method: "venues", query: {}, resultKey: "venues" },
    { argv: ["plays", "types"], command: "plays types", endpoint: "/plays/types", method: "playTypes", query: {}, resultKey: "play_types" },
    { argv: ["plays", "stats", "types"], command: "plays stats types", endpoint: "/plays/stats/types", method: "playStatTypes", query: {}, resultKey: "play_stat_types" },
    { argv: ["playoffs", "cfp", "--year", "2025"], command: "playoffs cfp", endpoint: "/playoffs/cfp", method: "cfpPlayoff", query: { year: 2025 }, resultKey: "playoff" },
    { argv: ["playoffs", "cfp", "participants", "--year", "2025"], command: "playoffs cfp participants", endpoint: "/playoffs/cfp/participants", method: "cfpParticipants", query: { year: 2025 }, resultKey: "participants" },
    { argv: ["playoffs", "cfp", "games", "--year", "2025"], command: "playoffs cfp games", endpoint: "/playoffs/cfp/games", method: "cfpGames", query: { year: 2025 }, resultKey: "games" },
    { argv: ["games", "media", "--year", "2026"], command: "games media", endpoint: "/games/media", method: "media", query: { year: 2026 }, resultKey: "media" },
    { argv: ["live", "plays", "--game-id", "1"], command: "live plays", endpoint: "/live/plays", method: "livePlays", query: { gameId: 1 }, resultKey: "live_game" },
    { argv: ["lines", "--year", "2024", "--week", "0", "--team", "Florida State"], command: "lines", endpoint: "/lines", method: "lines", query: { team: "Florida State", week: 0, year: 2024 }, resultKey: "lines" },
    { argv: ["info"], command: "info", endpoint: "/info", method: "userInfo", query: {}, resultKey: "info" },
    { argv: ["records", "--year", "2026"], command: "records", endpoint: "/records", method: "records", query: { year: 2026 }, resultKey: "records" },
    { argv: ["calendar", "--year", "2026"], command: "calendar", endpoint: "/calendar", method: "calendar", query: { year: 2026 }, resultKey: "calendar" },
    { argv: ["scoreboard"], command: "scoreboard", endpoint: "/scoreboard", method: "scoreboard", query: {}, resultKey: "scoreboard" },
    { argv: ["game", "box", "advanced", "--id", "1"], command: "game box advanced", endpoint: "/game/box/advanced", method: "advancedBoxScore", query: { id: 1 }, resultKey: "box_score" },
  ];

  for (const route of cases) {
    test(route.endpoint, async () => {
      const invocation = await invokeReferenceRoute(route.argv);
      expect(invocation.calls).toEqual([{ method: route.method, query: route.query }]);
      expect(invocation.output.command).toBe(route.command);
      expect(invocation.output.endpoint).toBe(route.endpoint);
      expect(invocation.output.query).toEqual(snakeCaseDeep(route.query));
      expect(invocation.output).toHaveProperty(route.resultKey);
    });
  }
});

describe("reference endpoint adapter", () => {
  test("exposes the complete reference slice without making a request", () => {
    expect(Object.keys(createReferenceCfbdApi())).toEqual([
      "teams",
      "matchup",
      "conferences",
      "talent",
      "venues",
      "playTypes",
      "playStatTypes",
      "cfpPlayoff",
      "cfpParticipants",
      "cfpGames",
      "media",
      "livePlays",
      "lines",
      "teamAts",
      "userInfo",
      "records",
      "calendar",
      "scoreboard",
      "advancedBoxScore",
    ]);
  });
});

describe("reference endpoint query builders", () => {
  test("map every supported provider query field exactly", () => {
    expect(buildNoQuery()).toEqual({});
    expect(buildTeamsQuery({ conference: "ACC", year: 2026 })).toEqual({
      conference: "ACC",
      year: 2026,
    });
    expect(
      buildMatchupQuery({
        team1: "Florida State",
        team2: "Miami",
        minYear: 2000,
        maxYear: 2025,
      }),
    ).toEqual({
      maxYear: 2025,
      minYear: 2000,
      team1: "Florida State",
      team2: "Miami",
    });
    expect(buildTalentQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(buildCfpPlayoffQuery({ year: 2025 })).toEqual({ year: 2025 });
    expect(buildCfpParticipantsQuery({ year: 2025 })).toEqual({ year: 2025 });
    expect(buildCfpGamesQuery({ year: 2025, round: "semifinal" })).toEqual({
      round: "semifinal",
      year: 2025,
    });
    expect(
      buildMediaQuery({
        year: 2026,
        week: 0,
        seasonType: "regular",
        team: "Florida State",
        conference: "ACC",
        mediaType: "tv",
        classification: "fbs",
      }),
    ).toEqual({
      classification: "fbs",
      conference: "ACC",
      mediaType: "tv",
      seasonType: "regular",
      team: "Florida State",
      week: 0,
      year: 2026,
    });
    expect(buildLivePlaysQuery({ gameId: 401752731 })).toEqual({
      gameId: 401752731,
    });
    expect(
      buildLinesQuery({
        away: "Boston College",
        conference: "ACC",
        gameId: 401628334,
        home: "Florida State",
        provider: "consensus",
        seasonType: "regular",
        team: "Florida State",
        week: 0,
        year: 2024,
      }),
    ).toEqual({
      away: "Boston College",
      conference: "ACC",
      gameId: 401628334,
      home: "Florida State",
      provider: "consensus",
      seasonType: "regular",
      team: "Florida State",
      week: 0,
      year: 2024,
    });
    expect(
      buildTeamAtsQuery({
        conference: "ACC",
        team: "Florida State",
        year: 2024,
      }),
    ).toEqual({ conference: "ACC", team: "Florida State", year: 2024 });
    expect(
      buildRecordsQuery({ year: 2026, team: "Florida State", conference: "ACC" }),
    ).toEqual({ year: 2026, team: "Florida State", conference: "ACC" });
    expect(buildCalendarQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(
      buildScoreboardQuery({ classification: "fbs", conference: "ACC" }),
    ).toEqual({ classification: "fbs", conference: "ACC" });
    expect(buildAdvancedBoxScoreQuery({ id: 401752731 })).toEqual({
      id: 401752731,
    });
  });

  test("accept valid minimal queries", () => {
    expect(validateNoQuery({})).toEqual({});
    expect(validateTeamsQuery({})).toEqual({});
    expect(
      validateMatchupQuery({ team1: "Florida State", team2: "Miami" }),
    ).toEqual({ team1: "Florida State", team2: "Miami" });
    expect(validateTalentQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(validateCfpPlayoffQuery({ year: 2025 })).toEqual({ year: 2025 });
    expect(validateCfpParticipantsQuery({ year: 2025 })).toEqual({ year: 2025 });
    expect(validateCfpGamesQuery({ year: 2025 })).toEqual({ year: 2025 });
    expect(validateMediaQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(validateLivePlaysQuery({ gameId: 1 })).toEqual({ gameId: 1 });
    expect(validateLinesQuery({ gameId: 1 })).toEqual({ gameId: 1 });
    expect(validateLinesQuery({ year: 2024, week: 0 })).toEqual({
      week: 0,
      year: 2024,
    });
    expect(validateTeamAtsQuery({ year: 2024 })).toEqual({ year: 2024 });
    expect(validateRecordsQuery({ team: "Florida State" })).toEqual({
      team: "Florida State",
    });
    expect(validateCalendarQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(validateScoreboardQuery({})).toEqual({});
    expect(validateAdvancedBoxScoreQuery({ id: 1 })).toEqual({ id: 1 });
  });

  test("enforce conditional and required filters with Zod-backed validation", () => {
    expect(() => validateMatchupQuery({})).toThrow("team1 and team2 are required");
    expect(() =>
      validateMatchupQuery({
        team1: "Florida State",
        team2: "Miami",
        minYear: 2025,
        maxYear: 2000,
      }),
    ).toThrow("minYear must be less than or equal to maxYear");
    expect(() => validateTalentQuery({})).toThrow("year is required");
    expect(() => validateCfpPlayoffQuery({})).toThrow("year is required");
    expect(() => validateCfpParticipantsQuery({})).toThrow("year is required");
    expect(() => validateCfpGamesQuery({})).toThrow("year is required");
    expect(() => validateMediaQuery({})).toThrow("year is required");
    expect(() => validateLivePlaysQuery({})).toThrow("gameId is required");
    expect(() => validateLinesQuery({ provider: "consensus" })).toThrow(
      "year is required when gameId is not specified",
    );
    expect(() => validateLinesQuery({ gameId: 0 })).toThrow();
    expect(() => validateLinesQuery({ year: 0 })).toThrow();
    expect(() => validateLinesQuery({ year: 2024, week: -1 })).toThrow();
    expect(() =>
      validateLinesQuery({ year: 2024, seasonType: "preseason" as "regular" }),
    ).toThrow();
    expect(() => validateLinesQuery({ year: 2024, provider: " " })).toThrow();
    expect(() => validateTeamAtsQuery({})).toThrow("year is required");
    expect(() => validateTeamAtsQuery({ year: 0 })).toThrow();
    expect(() => validateTeamAtsQuery({ year: 2024, team: " " })).toThrow();
    expect(() => validateRecordsQuery({})).toThrow("year or team is required");
    expect(() => validateCalendarQuery({})).toThrow("year is required");
    expect(() => validateAdvancedBoxScoreQuery({})).toThrow("id is required");
    expect(() => validateTeamsQuery({ year: 0 })).toThrow();
    expect(() => validateScoreboardQuery({ classification: "naia" as "fbs" })).toThrow();
  });
});

describe("reference endpoint transformers", () => {
  test("snake-case reference arrays while preserving false and zero", () => {
    expect(
      transformConferences([
        {
          id: 1,
          name: "Atlantic Coast Conference",
          shortName: "ACC",
          abbreviation: "ACC",
          classification: "fbs",
        } satisfies Conference,
      ]),
    ).toEqual([
      {
        id: 1,
        name: "Atlantic Coast Conference",
        short_name: "ACC",
        abbreviation: "ACC",
        classification: "fbs",
      },
    ]);

    expect(
      transformVenues([
        {
          id: 1,
          name: "Doak Campbell Stadium",
          city: "Tallahassee",
          state: "FL",
          zip: null,
          countryCode: "US",
          timezone: "America/New_York",
          latitude: 30.4382,
          longitude: -84.3044,
          elevation: null,
          capacity: 0,
          constructionYear: 1950,
          grass: false,
          dome: false,
        } satisfies Venue,
      ]),
    ).toEqual([
      {
        id: 1,
        name: "Doak Campbell Stadium",
        city: "Tallahassee",
        state: "FL",
        country_code: "US",
        timezone: "America/New_York",
        latitude: 30.4382,
        longitude: -84.3044,
        capacity: 0,
        construction_year: 1950,
        grass: false,
        dome: false,
      },
    ]);
  });

  test("reshape matchup results and omit nullish game fields", () => {
    const matchup = {
      team1: "Florida State",
      team2: "Miami",
      startYear: 2000,
      endYear: 2025,
      team1Wins: 15,
      team2Wins: 10,
      ties: 0,
      games: [
        {
          season: 2025,
          week: 9,
          seasonType: "regular",
          date: "2025-10-25T00:00:00Z",
          neutralSite: false,
          venue: null,
          homeTeam: "Florida State",
          homeScore: 0,
          awayTeam: "Miami",
          awayScore: 0,
          winner: null,
        },
      ],
    } satisfies Matchup;

    expect(transformMatchup(matchup)).toEqual({
      team_1: "Florida State",
      team_2: "Miami",
      start_year: 2000,
      end_year: 2025,
      team_1_wins: 15,
      team_2_wins: 10,
      ties: 0,
      games: [
        {
          season: 2025,
          week: 9,
          season_type: "regular",
          date: "2025-10-25T00:00:00Z",
          neutral_site: false,
          home_team: "Florida State",
          home_score: 0,
          away_team: "Miami",
          away_score: 0,
        },
      ],
    });
  });

  test("provide endpoint-specific transforms for every reference response", () => {
    expect(
      transformTalent([{ year: 2026, team: "Florida State", talent: 900.125 } satisfies TeamTalent]),
    ).toEqual([{ year: 2026, team: "Florida State", talent: 900.125 }]);
    expect(
      transformPlayTypes([{ id: 1, text: "Rush", abbreviation: null } satisfies PlayType]),
    ).toEqual([{ id: 1, text: "Rush" }]);
    expect(
      transformPlayStatTypes([{ id: 1, name: "Tackle" } satisfies PlayStatType]),
    ).toEqual([{ id: 1, name: "Tackle" }]);
    expect(
      transformGameMedia([
        {
          id: 1,
          season: 2026,
          week: 1,
          seasonType: "regular",
          startTime: "2026-09-01T00:00:00Z",
          isStartTimeTBD: false,
          homeTeam: "Florida State",
          homeConference: "ACC",
          awayTeam: "Alabama",
          awayConference: "SEC",
          mediaType: "tv",
          outlet: "ABC",
        } satisfies GameMedia,
      ]),
    ).toMatchObject([{ season_type: "regular", is_start_time_tbd: false }]);
    expect(
      transformRecords([
        {
          year: 2026,
          teamId: 52,
          team: "Florida State",
          classification: "fbs",
          conference: "ACC",
          division: "Atlantic",
          expectedWins: null,
          total: { games: 0, wins: 0, losses: 0, ties: 0 },
          conferenceGames: { games: 0, wins: 0, losses: 0, ties: 0 },
          homeGames: { games: 0, wins: 0, losses: 0, ties: 0 },
          awayGames: { games: 0, wins: 0, losses: 0, ties: 0 },
          neutralSiteGames: { games: 0, wins: 0, losses: 0, ties: 0 },
          regularSeason: { games: 0, wins: 0, losses: 0, ties: 0 },
          postseason: { games: 0, wins: 0, losses: 0, ties: 0 },
        } satisfies TeamRecords,
      ]),
    ).toMatchObject([{ team_id: 52, conference_games: { games: 0 } }]);
    expect(
      transformCalendar([
        {
          season: 2026,
          week: 0,
          seasonType: "regular",
          startDate: "2026-08-20",
          endDate: "2026-08-27",
          firstGameStart: "2026-08-20",
          lastGameStart: "2026-08-27",
        } satisfies CalendarWeek,
      ]),
    ).toMatchObject([{ week: 0, season_type: "regular" }]);
    expect(transformUserInfo(null)).toEqual({});
    expect(
      transformUserInfo({
        patronLevel: 1,
        tierName: "Free",
        monthlyLimit: 1000,
        remainingCalls: 0,
        usedCalls: 1000,
        resetAt: "2026-09-01",
        sharedPool: false,
        products: ["cfb"],
        features: {
          adjustedMetrics: false,
          weather: false,
          scoreboard: false,
          livePlayByPlay: false,
          graphQl: false,
        },
      } satisfies UserInfo),
    ).toMatchObject({ patron_level: 1, shared_pool: false, remaining_calls: 0 });
  });

  test("reshape historical lines and ATS summaries without losing precision or zeroes", () => {
    expect(
      transformLines([
        {
          id: 401628334,
          season: 2024,
          seasonType: "regular",
          week: 0,
          startDate: "2024-08-24T16:00:00Z",
          homeTeamId: 52,
          homeTeam: "Florida State",
          homeConference: "ACC",
          homeClassification: "fbs",
          homeScore: 0,
          awayTeamId: 103,
          awayTeam: "Boston College",
          awayConference: null,
          awayClassification: "fbs",
          awayScore: null,
          lines: [
            {
              provider: "consensus",
              spread: 0,
              formattedSpread: "",
              spreadOpen: -1.5,
              overUnder: 55.125,
              overUnderOpen: 0,
              homeMoneyline: 0,
              awayMoneyline: null,
            },
          ],
        } satisfies BettingGame,
      ]),
    ).toEqual([
      {
        id: 401628334,
        season: 2024,
        week: 0,
        season_type: "regular",
        start_date: "2024-08-24T16:00:00Z",
        matchup: "Boston College at Florida State",
        home: {
          id: 52,
          team: "Florida State",
          conference: "ACC",
          classification: "fbs",
          score: 0,
        },
        away: {
          id: 103,
          team: "Boston College",
          classification: "fbs",
        },
        lines: [
          {
            provider: "consensus",
            spread: 0,
            formatted_spread: "",
            spread_open: -1.5,
            over_under: 55.125,
            over_under_open: 0,
            home_moneyline: 0,
          },
        ],
      },
    ]);

    expect(
      transformTeamAts([
        {
          year: 2024,
          teamId: 52,
          team: "Florida State",
          conference: null,
          games: 0,
          atsWins: 0,
          atsLosses: 0,
          atsPushes: 0,
          avgCoverMargin: null,
        },
        {
          year: 2024,
          teamId: 103,
          team: "Boston College",
          conference: "ACC",
          games: 12,
          atsWins: 6,
          atsLosses: 5,
          atsPushes: 1,
          avgCoverMargin: -3.125,
        },
      ] satisfies TeamATS[]),
    ).toEqual([
      {
        year: 2024,
        team_id: 52,
        team: "Florida State",
        games: 0,
        ats_wins: 0,
        ats_losses: 0,
        ats_pushes: 0,
      },
      {
        year: 2024,
        team_id: 103,
        team: "Boston College",
        conference: "ACC",
        games: 12,
        ats_wins: 6,
        ats_losses: 5,
        ats_pushes: 1,
        avg_cover_margin: -3.125,
      },
    ]);
  });

  test("snake-case playoff, live, and advanced box-score nesting", () => {
    expect(
      transformCfpPlayoff({
        season: 2025,
        competition: "cfp",
        format: "12-team",
        teamCount: 12,
        status: "scheduled",
        participants: [],
        rounds: [],
        champion: null,
      } satisfies CfpPlayoff),
    ).toEqual({
      season: 2025,
      competition: "cfp",
      format: "12-team",
      team_count: 12,
      status: "scheduled",
      participants: [],
      rounds: [],
    });
    expect(
      transformCfpParticipants([
        {
          team: { id: 52, school: "Florida State", conference: "ACC" },
          committeeRank: 1,
          seed: 1,
          bidType: "at_large",
          qualificationReason: null,
          conferenceChampion: false,
          qualifyingConference: null,
          firstRoundBye: false,
          outcome: "active",
          eliminatedRound: null,
        } as PlayoffParticipant,
      ]),
    ).toMatchObject([{ committee_rank: 1, conference_champion: false }]);
    expect(
      transformCfpGames([
        {
          id: 1,
          bracketSlot: "A",
          round: "first_round",
          roundName: "First Round",
          roundOrder: 1,
          matchupOrder: 1,
          startDate: null,
          bowlName: null,
          slots: [],
          game: null,
          advancesTo: null,
        } satisfies PlayoffMatchup,
      ]),
    ).toMatchObject([{ bracket_slot: "A", round_order: 1 }]);
    expect(
      transformLivePlays({
        id: 1,
        status: "in_progress",
        period: 1,
        clock: "15:00",
        possession: "Florida State",
        down: 1,
        distance: 10,
        yardsToGoal: 75,
        teams: [],
        drives: [],
      } satisfies LiveGame),
    ).toMatchObject({ yards_to_goal: 75, teams: [], drives: [] });
    expect(
      transformAdvancedBoxScore({
        gameInfo: {
          excitement: 0,
          homeWinner: false,
          awayWinProb: 0.5,
          awayPoints: 0,
          awayTeam: "Alabama",
          homeWinProb: 0.5,
          homePoints: 0,
          homeTeam: "Florida State",
        },
        teams: {
          fieldPosition: [],
          scoringOpportunities: [],
          havoc: [],
          rushing: [],
          explosiveness: [],
          successRates: [],
          cumulativePpa: [],
          ppa: [],
        },
        players: { ppa: [], usage: [] },
      } satisfies AdvancedBoxScore),
    ).toMatchObject({
      game_info: { home_winner: false, home_points: 0 },
      teams: { cumulative_ppa: [] },
      players: { usage: [] },
    });
  });

  test("preserve betting data in scoreboard output", () => {
    const result = transformScoreboard([
      {
        id: 1,
        startDate: "2026-09-01T00:00:00Z",
        startTimeTBD: false,
        tv: null,
        neutralSite: false,
        conferenceGame: true,
        status: "scheduled",
        period: null,
        clock: null,
        situation: null,
        possession: null,
        lastPlay: null,
        venue: { state: "FL", city: "Tallahassee", name: "Doak" },
        homeTeam: {
          winProbability: null,
          lineScores: null,
          points: 0,
          classification: "fbs",
          conference: "ACC",
          name: "Florida State",
          id: 52,
        },
        awayTeam: {
          winProbability: null,
          lineScores: null,
          points: 0,
          classification: "fbs",
          conference: "SEC",
          name: "Alabama",
          id: 333,
        },
        weather: {
          windDirection: null,
          windSpeed: null,
          description: null,
          temperature: null,
        },
        betting: {
          awayMoneyline: -100,
          homeMoneyline: -100,
          overUnder: 50,
          spread: 0,
        },
      } satisfies ScoreboardGame,
    ]);

    expect(result[0]).toMatchObject({
      id: 1,
      matchup: "Alabama at Florida State",
      home: { points: 0 },
      away: { points: 0 },
      betting: {
        away_moneyline: -100,
        home_moneyline: -100,
        over_under: 50,
        spread: 0,
      },
    });
  });
});

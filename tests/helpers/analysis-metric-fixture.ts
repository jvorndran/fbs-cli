import type {
  AdvancedGameStat,
  Drive,
  Game,
  GameHavocStats,
  GamePlayerStats,
  Play,
} from "cfbd";
import { parse } from "yaml";

import type { CfbdApi } from "../../src/cfbd/api.ts";

export interface AnalysisMetricCall {
  method: string;
  query: Record<string, unknown>;
}

const TEAMS = ["Florida State", "Alpha", "Beta", "Gamma", "Delta"];

function roundRobinGames(): Game[] {
  const games: Game[] = [];
  let id = 1;
  for (let homeIndex = 0; homeIndex < TEAMS.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < TEAMS.length; awayIndex += 1) {
      games.push({
        id,
        season: 2026,
        week: 1,
        seasonType: "regular",
        startDate: `2026-09-01T${String(10 + id).padStart(2, "0")}:00:00Z`,
        completed: true,
        homeTeam: TEAMS[homeIndex]!,
        awayTeam: TEAMS[awayIndex]!,
        homeClassification: "fbs",
        awayClassification: "fbs",
        homePoints: 28,
        awayPoints: 14,
      } as Game);
      id += 1;
    }
  }
  return games;
}

function gamePlays(game: Game): Play[] {
  const forOffense = (offense: string, defense: string): Play[] => [
    {
      id: `${game.id}-${offense}-1`,
      driveId: `${game.id}-${offense}`,
      gameId: game.id,
      playNumber: 1,
      offense,
      defense,
      offenseScore: 0,
      defenseScore: 0,
      down: 1,
      distance: 10,
      yardsToGoal: 75,
      yardsGained: 5,
      scoring: false,
      playType: "Rush",
      ppa: 0.1,
    } as Play,
    {
      id: `${game.id}-${offense}-2`,
      driveId: `${game.id}-${offense}`,
      gameId: game.id,
      playNumber: 2,
      offense,
      defense,
      offenseScore: 0,
      defenseScore: 0,
      down: 2,
      distance: 5,
      yardsToGoal: 40,
      yardsGained: 20,
      scoring: false,
      playType: "Pass Reception",
      ppa: 0.2,
    } as Play,
    {
      id: `${game.id}-${offense}-3`,
      driveId: `${game.id}-${offense}`,
      gameId: game.id,
      playNumber: 3,
      offense,
      defense,
      offenseScore: 0,
      defenseScore: 0,
      down: 3,
      distance: 2,
      yardsToGoal: 2,
      yardsGained: 2,
      scoring: false,
      playType: "Rush",
      ppa: -0.1,
    } as Play,
  ];
  return [
    ...forOffense(game.homeTeam, game.awayTeam),
    ...forOffense(game.awayTeam, game.homeTeam),
  ];
}

function drive(game: Game, offense: string, defense: string): Drive {
  return {
    gameId: game.id,
    id: `${game.id}-${offense}`,
    offense,
    defense,
    startYardsToGoal: 75,
    yards: 40,
    driveResult: "TOUCHDOWN",
    startOffenseScore: 0,
    endOffenseScore: 7,
  } as Drive;
}

function playerStats(gameId: number): GamePlayerStats {
  return {
    id: gameId,
    teams: [{
      team: "Florida State",
      categories: [
        { name: "passing", types: [{ name: "ATT", athletes: [
          { id: "9007199254740993", name: "Quarterback", stat: "10" },
        ] }] },
        { name: "rushing", types: [
          { name: "CAR", athletes: [
            { id: "9007199254740993", name: "Quarterback", stat: "2" },
            { id: "9007199254740994", name: "Running Back", stat: "8" },
          ] },
          { name: "TD", athletes: [
            { id: "9007199254740994", name: "Running Back", stat: "1" },
          ] },
        ] },
        { name: "receiving", types: [
          { name: "REC", athletes: [
            { id: "9007199254740994", name: "Running Back", stat: "3" },
          ] },
          { name: "TD", athletes: [
            { id: "9007199254740994", name: "Running Back", stat: "1" },
          ] },
        ] },
      ],
    }],
  } as GamePlayerStats;
}

export function createAnalysisMetricFixture(): {
  api: CfbdApi;
  calls: AnalysisMetricCall[];
} {
  const games = roundRobinGames();
  const includedGames = games.filter((game) =>
    game.homeTeam === "Florida State" || game.awayTeam === "Florida State",
  );
  const plays = games.flatMap(gamePlays);
  const drives = includedGames.flatMap((game) => [
    drive(game, game.homeTeam, game.awayTeam),
    drive(game, game.awayTeam, game.homeTeam),
  ]);
  const advanced = includedGames.map((game) => ({
    gameId: game.id,
    team: "Florida State",
    offense: { lineYardsTotal: 6 },
    defense: { lineYardsTotal: 4 },
  } as AdvancedGameStat));
  const havoc = includedGames.map((game) => ({
    gameId: game.id,
    team: "Florida State",
    offense: {
      totalPlays: 3,
      dbHavocEvents: 0,
      frontSevenHavocEvents: 1,
      totalHavocEvents: 1,
    },
    defense: {
      totalPlays: 3,
      dbHavocEvents: 1,
      frontSevenHavocEvents: 0,
      totalHavocEvents: 1,
    },
  } as GameHavocStats));
  const calls: AnalysisMetricCall[] = [];
  const responses: Record<string, unknown> = {
    games,
    plays,
    playTypes: [
      { id: 1, text: "Rush", abbreviation: "RUSH" },
      { id: 2, text: "Pass Reception", abbreviation: "PASS" },
    ],
    drives,
    gamePlayerStats: includedGames.map((game) => playerStats(game.id)),
    advancedGameStats: advanced,
    gameHavocStats: havoc,
  };
  const api = new Proxy({} as CfbdApi, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return async (query: Record<string, unknown> = {}) => {
        calls.push({ method: property, query: { ...query } });
        return responses[property] ?? [];
      };
    },
  });
  return { api, calls };
}

export const EXPECTED_COMPLETE_ANALYSIS = parse(`
team: Florida State
year: 2026
as_of: 2026-10-01T00:00:00.000Z
games:
  scheduled: 4
  included: 4
  wins: 4
  losses: 0
  ties: 0
  ids: [1, 2, 3, 4]
analysis:
  offense:
    early_down_pass_pct: 50
    success_pct: 100
    positive_ppa_pct: 66.7
    ppa_per_play: 0.067
    explosive_pct: 33.3
    negative_play_pct: 0
    passing:
      success_pct: 100
      positive_ppa_pct: 100
      ppa_per_dropback: 0.2
      explosive_pct: 100
      sack_pct: 0
    rushing:
      success_pct: 100
      positive_ppa_pct: 50
      ppa_per_rush: 0
      explosive_pct: 0
      stuff_pct: 0
      power_success_pct: 100
      line_yards_per_rush: 3
    havoc_allowed:
      defensive_back_pct: 0
      front_seven_pct: 33.3
      total_pct: 33.3
  defense_allowed:
    early_down_pass_pct: 50
    success_pct: 100
    positive_ppa_pct: 66.7
    ppa_per_play: 0.067
    explosive_pct: 33.3
    negative_play_pct: 0
    passing:
      success_pct: 100
      positive_ppa_pct: 100
      ppa_per_dropback: 0.2
      explosive_pct: 100
      sack_pct: 0
    rushing:
      success_pct: 100
      positive_ppa_pct: 50
      ppa_per_rush: 0
      explosive_pct: 0
      stuff_pct: 0
      power_success_pct: 100
      line_yards_per_rush: 2
    havoc_created:
      defensive_back_pct: 33.3
      front_seven_pct: 0
      total_pct: 33.3
  drives:
    offense:
      points_per_drive: 7
      touchdown_pct: 100
      empty_drive_pct: 0
      three_and_out_pct: 0
      scoring_opportunity_pct: 100
      points_per_scoring_opportunity: 7
      available_yards_pct: 53.3
    defense_allowed:
      points_per_drive: 7
      touchdown_pct: 100
      empty_drive_pct: 0
      three_and_out_pct: 0
      scoring_opportunity_pct: 100
      points_per_scoring_opportunity: 7
      available_yards_pct: 53.3
  proe:
    offense:
      actual_pass_pct: 33.3
      expected_pass_pct: 33.3
      difference_pp: 0
    defense_allowed:
      actual_pass_pct: 33.3
      expected_pass_pct: 33.3
      difference_pp: 0
  players:
    - id: "9007199254740993"
      name: Quarterback
      roles: [passer, skill]
      season:
        pass_attempts: 40
        pass_attempt_share_pct: 100
        carries: 8
        carry_share_pct: 20
        receptions: 0
        reception_share_pct: 0
        offensive_touchdowns: 0
        credited_opportunities: 8
        opportunity_share_pct: 15.4
      last_four:
        pass_attempts: 40
        pass_attempt_share_pct: 100
        credited_opportunities: 8
        opportunity_share_pct: 15.4
      last_two_vs_previous_two:
        pass_attempt_change: 0
        pass_attempt_share_change_pp: 0
        opportunity_change: 0
        opportunity_share_change_pp: 0
    - id: "9007199254740994"
      name: Running Back
      roles: [skill]
      season:
        carries: 32
        carry_share_pct: 80
        receptions: 12
        reception_share_pct: 100
        offensive_touchdowns: 8
        credited_opportunities: 44
        opportunity_share_pct: 84.6
      last_four:
        credited_opportunities: 44
        opportunity_share_pct: 84.6
      last_two_vs_previous_two:
        opportunity_change: 0
        opportunity_share_change_pp: 0
  adjusted_strength:
    peer_teams: 5
    offense:
      overall_rank: 4
      passing_rank: 4
      rushing_rank: 4
    defense:
      overall_rank: 4
      passing_rank: 4
      rushing_rank: 4
`);

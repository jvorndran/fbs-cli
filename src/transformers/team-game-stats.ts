import type { GameTeamStats, GameTeamStatsTeamStat } from "cfbd";

import {
  compactObject,
  parseStatValue,
  toSnakeCase,
  type AgentObject,
  type AgentValue,
} from "./common.ts";

export function transformStatPairs(
  stats: readonly GameTeamStatsTeamStat[],
): AgentObject {
  const pairs: Array<[string, AgentValue]> = stats.map(({ category, stat }) => [
    toSnakeCase(category),
    parseStatValue(stat),
  ]);

  return Object.fromEntries(pairs) as AgentObject;
}

export function transformTeamGameStats(
  games: readonly GameTeamStats[],
): AgentObject[] {
  return games.map((game) =>
    compactObject({
      game_id: game.id,
      teams: game.teams.map((team) =>
        compactObject({
          team_id: team.teamId,
          team: team.team,
          conference: team.conference,
          home_away: team.homeAway,
          points: team.points,
          stats: transformStatPairs(team.stats),
        }),
      ),
    }),
  );
}

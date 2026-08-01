import type { GamePlayerStats } from "cfbd";

import {
  compactObject,
  parseStatValue,
  type AgentObject,
} from "./common.ts";

export function transformPlayerGameStats(
  games: readonly GamePlayerStats[],
): AgentObject[] {
  const rows: AgentObject[] = [];

  for (const game of games) {
    for (const team of game.teams) {
      for (const category of team.categories) {
        for (const statType of category.types) {
          for (const athlete of statType.athletes) {
            rows.push(
              compactObject({
                game_id: game.id,
                team: team.team,
                conference: team.conference,
                home_away: team.homeAway,
                points: team.points,
                player_id: athlete.id,
                player: athlete.name,
                category: category.name,
                stat_type: statType.name,
                value: parseStatValue(athlete.stat),
              }),
            );
          }
        }
      }
    }
  }

  return rows;
}

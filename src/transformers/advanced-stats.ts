import type { AdvancedGameStat, AdvancedSeasonStat } from "cfbd";

import {
  compactObject,
  toSnakeCaseObject,
  type AgentObject,
} from "./common.ts";

export function transformAdvancedGameStats(
  stats: readonly AdvancedGameStat[],
): AgentObject[] {
  return stats.map((stat) =>
    compactObject({
      game_id: stat.gameId,
      season: stat.season,
      week: stat.week,
      season_type: stat.seasonType,
      team: stat.team,
      opponent: stat.opponent,
      offense: toSnakeCaseObject(stat.offense),
      defense: toSnakeCaseObject(stat.defense),
    }),
  );
}

export function transformAdvancedSeasonStats(
  stats: readonly AdvancedSeasonStat[],
): AgentObject[] {
  return stats.map((stat) =>
    compactObject({
      season: stat.season,
      team: stat.team,
      conference: stat.conference,
      offense: toSnakeCaseObject(stat.offense),
      defense: toSnakeCaseObject(stat.defense),
    }),
  );
}

import type { PlayStat } from "cfbd";

import {
  compactObject,
  formatClock,
  type AgentObject,
} from "./common.ts";

export function transformPlayStats(stats: readonly PlayStat[]): AgentObject[] {
  return stats.map((stat) =>
    compactObject({
      game_id: stat.gameId,
      play_id: stat.playId,
      drive_id: stat.driveId,
      season: stat.season,
      week: stat.week,
      team: stat.team,
      conference: stat.conference,
      opponent: stat.opponent,
      team_score: stat.teamScore,
      opponent_score: stat.opponentScore,
      athlete_id: stat.athleteId,
      athlete: stat.athleteName,
      stat_type: stat.statType,
      value: stat.stat,
      period: stat.period,
      clock: formatClock(stat.clock),
      down: stat.down,
      distance: stat.distance,
      yards_to_goal: stat.yardsToGoal,
    }),
  );
}

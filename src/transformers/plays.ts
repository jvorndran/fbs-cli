import type { Play } from "cfbd";

import {
  compactObject,
  formatClock,
  type AgentObject,
} from "./common.ts";

export function transformPlays(plays: readonly Play[]): AgentObject[] {
  return plays.map((play) =>
    compactObject({
      id: play.id,
      game_id: play.gameId,
      drive_id: play.driveId,
      drive_number: play.driveNumber,
      play_number: play.playNumber,
      offense: play.offense,
      offense_conference: play.offenseConference,
      offense_score: play.offenseScore,
      defense: play.defense,
      defense_conference: play.defenseConference,
      defense_score: play.defenseScore,
      home: play.home,
      away: play.away,
      period: play.period,
      clock: formatClock(play.clock),
      wallclock: play.wallclock,
      down: play.down,
      distance: play.distance,
      yard_line: play.yardline,
      yards_to_goal: play.yardsToGoal,
      offense_timeouts: play.offenseTimeouts,
      defense_timeouts: play.defenseTimeouts,
      play_type: play.playType,
      yards_gained: play.yardsGained,
      ppa: play.ppa,
      scoring: play.scoring,
      description: play.playText,
    }),
  );
}

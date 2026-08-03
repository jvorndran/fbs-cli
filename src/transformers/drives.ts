import type { Drive } from "cfbd";

import { compactObject, formatClock, type AgentObject } from "./common.ts";

function score(offense: number, defense: number): string {
  return `${offense}-${defense}`;
}

export function transformDrives(drives: readonly Drive[]): AgentObject[] {
  return drives.map((drive) =>
    compactObject({
      id: drive.id,
      game_id: drive.gameId,
      drive_number: drive.driveNumber,
      offense: drive.offense,
      offense_conference: drive.offenseConference,
      defense: drive.defense,
      defense_conference: drive.defenseConference,
      is_home_offense: drive.isHomeOffense,
      start: compactObject({
        period: drive.startPeriod,
        clock: formatClock(drive.startTime),
        yard_line: drive.startYardline,
        yards_to_goal: drive.startYardsToGoal,
        offense_score: drive.startOffenseScore,
        defense_score: drive.startDefenseScore,
        score: score(drive.startOffenseScore, drive.startDefenseScore),
      }),
      end: compactObject({
        period: drive.endPeriod,
        clock: formatClock(drive.endTime),
        yard_line: drive.endYardline,
        yards_to_goal: drive.endYardsToGoal,
        offense_score: drive.endOffenseScore,
        defense_score: drive.endDefenseScore,
        score: score(drive.endOffenseScore, drive.endDefenseScore),
      }),
      elapsed: formatClock(drive.elapsed),
      plays: drive.plays,
      yards: drive.yards,
      result: drive.driveResult,
      scoring: drive.scoring,
    }),
  );
}

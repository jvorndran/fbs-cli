import type { GameTeamStats, GameTeamStatsTeamStat } from "cfbd";

import { CliError } from "../errors";
import {
  compactObject,
  parseStatValue,
  toSnakeCase,
  type AgentObject,
} from "./common.ts";

export function transformStatPairs(
  stats: readonly GameTeamStatsTeamStat[],
): AgentObject {
  const transformed: AgentObject = {};

  for (const { category, stat } of stats) {
    const key = toSnakeCase(category);

    if (Object.hasOwn(transformed, key)) {
      throw new CliError({
        code: "cfbd_invalid_response",
        message: `CFBD returned duplicate team stat category '${key}' after normalization.`,
        hint: "Retry later or report the incompatible CFBD response shape.",
      });
    }

    transformed[key] = parseStatValue(stat);
  }

  return transformed;
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

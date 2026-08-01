import type { PlayerUsage } from "cfbd";

import {
  compactObject,
  toSnakeCaseObject,
  type AgentObject,
} from "./common.ts";

export function transformPlayerUsage(
  players: readonly PlayerUsage[],
): AgentObject[] {
  return players.map((player) =>
    compactObject({
      season: player.season,
      player_id: player.id,
      player: player.name,
      position: player.position,
      team: player.team,
      conference: player.conference,
      usage: toSnakeCaseObject(player.usage),
    }),
  );
}

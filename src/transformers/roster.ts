import type { RosterPlayer } from "cfbd";

import {
  compactObject,
  nonEmptyObject,
  type AgentObject,
} from "./common.ts";

export function transformRoster(players: readonly RosterPlayer[]): AgentObject[] {
  return players.map((player) => {
    const hometown = compactObject({
      city: player.homeCity,
      state: player.homeState,
      country: player.homeCountry,
      latitude: player.homeLatitude,
      longitude: player.homeLongitude,
      county_fips: player.homeCountyFIPS,
    });

    return compactObject({
      id: player.id,
      name: [player.firstName, player.lastName]
        .filter((part) => typeof part === "string")
        .join(" ")
        .trim(),
      team: player.team,
      position: player.position,
      jersey: player.jersey,
      year: player.year,
      height_inches: player.height,
      weight_lbs: player.weight,
      hometown: nonEmptyObject(hometown),
      recruit_ids: player.recruitIds,
    });
  });
}

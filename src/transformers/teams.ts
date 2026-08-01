import type { Team } from "cfbd";

import {
  compactObject,
  nonEmptyObject,
  toSnakeCaseObject,
  type AgentObject,
} from "./common.ts";

export function transformTeams(teams: readonly Team[]): AgentObject[] {
  return teams.map((team) =>
    compactObject({
      id: team.id,
      school: team.school,
      mascot: team.mascot,
      abbreviation: team.abbreviation,
      alternate_names: team.alternateNames,
      conference: team.conference,
      division: team.division,
      classification: team.classification,
      color: team.color,
      alternate_color: team.alternateColor,
      logos: team.logos,
      twitter: team.twitter,
      location:
        team.location === null
          ? undefined
          : nonEmptyObject(toSnakeCaseObject(team.location)),
    }),
  );
}

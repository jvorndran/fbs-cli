import type {
  GetAggregatedTeamRecruitingRatingsResponse,
  GetRecruitsResponse,
  GetTeamRecruitingRankingsResponse,
} from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformRecruitingPlayers(response: GetRecruitsResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformRecruitingTeams(
  response: GetTeamRecruitingRankingsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformRecruitingGroups(
  response: GetAggregatedTeamRecruitingRatingsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

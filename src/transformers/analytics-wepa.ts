import type {
  GetAdjustedPlayerPassingStatsResponse,
  GetAdjustedPlayerRushingStatsResponse,
  GetAdjustedTeamSeasonStatsResponse,
  GetKickerPaarResponse,
} from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformWepaTeamSeason(
  response: GetAdjustedTeamSeasonStatsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformWepaPassing(
  response: GetAdjustedPlayerPassingStatsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformWepaRushing(
  response: GetAdjustedPlayerRushingStatsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformWepaKicking(response: GetKickerPaarResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

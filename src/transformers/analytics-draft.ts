import type {
  GetDraftPicksResponse,
  GetDraftPositionsResponse,
  GetDraftTeamsResponse,
} from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformDraftTeams(response: GetDraftTeamsResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformDraftPositions(
  response: GetDraftPositionsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformDraftPicks(response: GetDraftPicksResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

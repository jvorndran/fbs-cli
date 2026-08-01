import type {
  GetConferenceSpResponse,
  GetEloResponse,
  GetExpandedSrsResponse,
  GetFpiResponse,
  GetSpResponse,
  GetSrsResponse,
} from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformSpRatings(response: GetSpResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformConferenceSpRatings(
  response: GetConferenceSpResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformSrsRatings(response: GetSrsResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformExpandedSrsRatings(
  response: GetExpandedSrsResponse,
): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformEloRatings(response: GetEloResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformFpiRatings(response: GetFpiResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

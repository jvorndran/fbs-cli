import type {
  GetCoachProfileResponse,
  GetCoachSeasonsResponse,
  GetCoachTenuresResponse,
  GetCoachesResponse,
} from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformCoaches(response: GetCoachesResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformCoachProfile(response: GetCoachProfileResponse): AgentObject {
  return toSnakeCaseObject(response);
}

export function transformCoachSeasons(response: GetCoachSeasonsResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

export function transformCoachTenures(response: GetCoachTenuresResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

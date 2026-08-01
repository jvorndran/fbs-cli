import type {
  GetPredictedPointsAddedByGameResponse,
  GetPredictedPointsAddedByPlayerGameResponse,
  GetPredictedPointsAddedByPlayerSeasonResponse,
  GetPredictedPointsAddedByTeamResponse,
  GetPredictedPointsResponse,
} from "cfbd";

import { type AgentValue, toSnakeCaseValue } from "./common";

function transformRows(rows: readonly unknown[]): AgentValue[] {
  const transformed: AgentValue[] = [];
  for (const row of rows) {
    const value = toSnakeCaseValue(row);
    if (value !== undefined) transformed.push(value);
  }
  return transformed;
}

export function transformPredictedPoints(
  response: GetPredictedPointsResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformTeamPpa(
  response: GetPredictedPointsAddedByTeamResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformGamePpa(
  response: GetPredictedPointsAddedByGameResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPlayerGamePpa(
  response: GetPredictedPointsAddedByPlayerGameResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPlayerSeasonPpa(
  response: GetPredictedPointsAddedByPlayerSeasonResponse,
): AgentValue[] {
  return transformRows(response);
}

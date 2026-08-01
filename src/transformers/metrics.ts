import type {
  GetFieldGoalExpectedPointsResponse,
  GetPregameWinProbabilitiesResponse,
  GetWinProbabilityResponse,
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

export function transformWinProbability(
  response: GetWinProbabilityResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPregameWinProbabilities(
  response: GetPregameWinProbabilitiesResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformFieldGoalExpectedPoints(
  response: GetFieldGoalExpectedPointsResponse,
): AgentValue[] {
  return transformRows(response);
}

import type {
  GetPlayerSeasonOverviewResponse,
  GetReturningProductionResponse,
  GetTransferPortalResponse,
  SearchPlayersResponse,
} from "cfbd";

import {
  type AgentObject,
  type AgentValue,
  toSnakeCaseObject,
  toSnakeCaseValue,
} from "./common";

function transformRows(rows: readonly unknown[]): AgentValue[] {
  const transformed: AgentValue[] = [];
  for (const row of rows) {
    const value = toSnakeCaseValue(row);
    if (value !== undefined) transformed.push(value);
  }
  return transformed;
}

export function transformPlayerSearch(
  response: SearchPlayersResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPlayerSeasonOverview(
  response: GetPlayerSeasonOverviewResponse,
): AgentObject {
  return toSnakeCaseObject(response);
}

export function transformReturningProduction(
  response: GetReturningProductionResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformTransferPortal(
  response: GetTransferPortalResponse,
): AgentValue[] {
  return transformRows(response);
}

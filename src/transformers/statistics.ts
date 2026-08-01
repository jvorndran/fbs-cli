import type {
  GetCategoriesResponse,
  GetGameHavocStatsResponse,
  GetPlayerGameSuccessRatesResponse,
  GetPlayerSeasonStatsResponse,
  GetPlayerSeasonSuccessRatesResponse,
  GetTeamStatsResponse,
} from "cfbd";

import {
  type AgentValue,
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

export function transformPlayerSeasonStats(
  response: GetPlayerSeasonStatsResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPlayerSeasonSuccessRates(
  response: GetPlayerSeasonSuccessRatesResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformPlayerGameSuccessRates(
  response: GetPlayerGameSuccessRatesResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformTeamSeasonStats(
  response: GetTeamStatsResponse,
): AgentValue[] {
  return transformRows(response);
}

export function transformStatCategories(
  response: GetCategoriesResponse,
): string[] {
  return [...response];
}

export function transformGameHavocStats(
  response: GetGameHavocStatsResponse,
): AgentValue[] {
  return transformRows(response);
}

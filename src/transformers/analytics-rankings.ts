import type { GetRankingsResponse } from "cfbd";

import { type AgentObject, toSnakeCaseObject } from "./common";

export function transformRankings(response: GetRankingsResponse): AgentObject[] {
  return response.map(toSnakeCaseObject);
}

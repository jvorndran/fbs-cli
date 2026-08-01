import type { UserUsage } from "cfbd";

import {
  compactObject,
  type AgentObject,
} from "./common.ts";

export function transformUsage(usage: UserUsage | null): AgentObject {
  if (usage === null) {
    return {};
  }

  return compactObject({
    window: compactObject({
      start: usage.window.start,
      end: usage.window.end,
    }),
    api: usage.api,
    totals: compactObject({
      requests: usage.totals.requests,
      cfb_requests: usage.totals.cfbRequests,
      cbb_requests: usage.totals.cbbRequests,
      unique_endpoints: usage.totals.uniqueEndpoints,
    }),
    top_endpoints: usage.topEndpoints.map((endpoint) =>
      compactObject({
        api: endpoint.api,
        endpoint: endpoint.endpoint,
        requests: endpoint.requests,
        last_used_at: endpoint.lastUsedAt,
      }),
    ),
    recent_requests: usage.recentRequests.map((request) =>
      compactObject({
        api: request.api,
        endpoint: request.endpoint,
        requested_at: request.requestedAt,
      }),
    ),
  });
}

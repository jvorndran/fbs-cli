import type { CfbdApi } from "../cfbd/api";
import type { AnalyticsCfbdApi } from "../cfbd/api-analytics";

export function asAnalyticsApi(api: CfbdApi): CfbdApi & AnalyticsCfbdApi {
  return api as CfbdApi & AnalyticsCfbdApi;
}

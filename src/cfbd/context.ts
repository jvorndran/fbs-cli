import type { Client } from "@hey-api/client-fetch";

import type { ValidatedApiKey } from "../auth/api-key";
import { executeCfbd, type RequestResult } from "./execute";

export interface CfbdApiContext {
  client: Client;
  execute<T>(request: () => Promise<RequestResult<T>>): Promise<T>;
}

export function createCfbdApiContext(
  client: Client,
  apiKey: ValidatedApiKey,
): CfbdApiContext {
  return {
    client,
    execute: <T>(request: () => Promise<RequestResult<T>>) =>
      executeCfbd(request, { sensitiveValues: [apiKey] }),
  };
}

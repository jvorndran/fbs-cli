import {
  createClient,
  type Client,
} from "@hey-api/client-fetch";

import type { ValidatedApiKey } from "../auth/api-key";

const CFBD_BASE_URL = "https://api.collegefootballdata.com";

export const CFBD_REQUEST_TIMEOUT_MS = 30_000;

export type CfbdFetch = (request: Request) => Promise<Response>;

export interface CreateCfbdClientOptions {
  fetch?: CfbdFetch;
  timeoutMs?: number;
}

export class CfbdTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, cause?: unknown) {
    super(
      `CFBD request timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "CfbdTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function createTimedFetch(
  fetchImplementation: CfbdFetch,
  timeoutMs: number,
): CfbdFetch {
  return async (request) => {
    const timeoutController = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        timeoutController.abort();
        reject(new CfbdTimeoutError(timeoutMs));
      }, timeoutMs);
    });
    const signal = AbortSignal.any([
      request.signal,
      timeoutController.signal,
    ]);

    try {
      return await Promise.race([
        fetchImplementation(new Request(request, { signal })),
        timeoutPromise,
      ]);
    } catch (error) {
      if (error instanceof CfbdTimeoutError) throw error;
      if (timeoutController.signal.aborted) {
        throw new CfbdTimeoutError(timeoutMs, error);
      }
      throw error;
    } finally {
      clearTimeout(timeout!);
    }
  };
}

export function createConfiguredCfbdClient(
  apiKey: ValidatedApiKey,
  options: CreateCfbdClientOptions = {},
): Client {
  const timeoutMs = options.timeoutMs ?? CFBD_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("CFBD request timeout must be a positive number.");
  }

  const fetchImplementation: CfbdFetch =
    options.fetch ?? ((request) => globalThis.fetch(request));

  return createClient({
    baseUrl: CFBD_BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    fetch: createTimedFetch(fetchImplementation, timeoutMs),
  });
}

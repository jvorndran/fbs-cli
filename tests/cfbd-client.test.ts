import { describe, expect, test } from "bun:test";

import { createCfbdApi } from "../src/cfbd/api.ts";

function successResponse(): Response {
  return new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("private CFBD clients", () => {
  test("keeps alternating API instances isolated by credential", async () => {
    const authorizationHeaders: Array<string | null> = [];
    const fetch = async (request: Request): Promise<Response> => {
      authorizationHeaders.push(request.headers.get("authorization"));
      return successResponse();
    };
    const first = createCfbdApi("first-test-key", { fetch });
    const second = createCfbdApi("second-test-key", { fetch });

    await first.userInfo();
    await second.userInfo();
    await first.userInfo();

    expect(authorizationHeaders).toEqual([
      "Bearer first-test-key",
      "Bearer second-test-key",
      "Bearer first-test-key",
    ]);
  });

  test("keeps concurrent API instances isolated by credential", async () => {
    const authorizationHeaders: Array<string | null> = [];
    const fetch = async (request: Request): Promise<Response> => {
      await Promise.resolve();
      authorizationHeaders.push(request.headers.get("authorization"));
      return successResponse();
    };
    const first = createCfbdApi("concurrent-first-key", { fetch });
    const second = createCfbdApi("concurrent-second-key", { fetch });

    await Promise.all([
      first.userInfo(),
      second.userInfo(),
      first.userInfo(),
      second.userInfo(),
    ]);

    expect(authorizationHeaders.sort()).toEqual([
      "Bearer concurrent-first-key",
      "Bearer concurrent-first-key",
      "Bearer concurrent-second-key",
      "Bearer concurrent-second-key",
    ]);
  });

  test("redacts an exact key echoed in a provider error", async () => {
    const apiKey = "provider-echo-secret";
    const api = createCfbdApi(apiKey, {
      fetch: async () =>
        new Response(
          JSON.stringify({ message: `Rejected credential ${apiKey}` }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    try {
      await api.userInfo();
      throw new Error("Expected the provider request to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "cfbd_unauthorized",
        message: "Rejected credential [REDACTED]",
      });
      expect((error as Error).message).not.toContain(apiKey);
    }
  });

  test("times out once without retrying", async () => {
    let requests = 0;
    const api = createCfbdApi("timeout-test-key", {
      timeoutMs: 5,
      fetch: async () => {
        requests += 1;
        return await new Promise<Response>(() => undefined);
      },
    });

    await expect(api.userInfo()).rejects.toMatchObject({
      code: "network_timeout",
      hint: "Try again; narrow large queries when possible.",
    });
    expect(requests).toBe(1);
  });

  test("rejects malformed direct credentials before fetch", async () => {
    let requests = 0;

    expect(() =>
      createCfbdApi("bad\nkey", {
        fetch: async () => {
          requests += 1;
          return successResponse();
        },
      }),
    ).toThrow();
    expect(requests).toBe(0);
  });
});

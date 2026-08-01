import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import { executeCfbd } from "../src/cfbd/execute.ts";
import { getApiKey } from "../src/config.ts";
import {
  CfbdRequestError,
  CliError,
  MissingApiKeyError,
  asCliError,
  redactSensitive,
} from "../src/errors.ts";
import { printErrorYaml, renderErrorYaml } from "../src/output/error.ts";
import { printAgentYaml, renderAgentYaml } from "../src/output/yaml.ts";

describe("success YAML", () => {
  const envelope = {
    command: "games",
    endpoint: "/games",
    query: { year: 2026, seasonType: "regular", omitted: undefined },
    count: 1,
    games: [
      {
        id: 401752731,
        startDate: "2026-09-05T23:30:00.000Z",
        completed: false,
        points: 0,
        notes: null,
      },
    ],
  };

  test("renders a deterministic, snake-cased envelope with one final newline", () => {
    const rendered = renderAgentYaml(envelope);

    expect(rendered).toBe(
      [
        "command: games",
        "endpoint: /games",
        "query:",
        "  year: 2026",
        "  season_type: regular",
        "count: 1",
        "games:",
        "  - id: 401752731",
        "    start_date: 2026-09-05T23:30:00.000Z",
        "    completed: false",
        "    points: 0",
        "",
      ].join("\n"),
    );
    expect(rendered.endsWith("\n")).toBe(true);
    expect(rendered.endsWith("\n\n")).toBe(false);
  });

  test("produces valid YAML and preserves date-looking strings as strings", () => {
    expect(parse(renderAgentYaml(envelope))).toEqual({
      command: "games",
      endpoint: "/games",
      query: { year: 2026, season_type: "regular" },
      count: 1,
      games: [
        {
          id: 401752731,
          start_date: "2026-09-05T23:30:00.000Z",
          completed: false,
          points: 0,
        },
      ],
    });
  });

  test("does not emit YAML anchors or aliases for duplicate objects", () => {
    const shared = { teamName: "Florida State" };
    const rendered = renderAgentYaml({
      command: "example",
      endpoint: "/example",
      query: {},
      count: 2,
      values: [shared, shared],
    });

    expect(rendered).not.toMatch(/[&*][A-Za-z0-9_-]+/);
    expect(parse(rendered).values).toEqual([
      { team_name: "Florida State" },
      { team_name: "Florida State" },
    ]);
  });

  test("writes only the rendered YAML to an injected stdout", () => {
    let stdout = "";
    printAgentYaml(envelope, (value) => {
      stdout += value;
    });

    expect(stdout).toBe(renderAgentYaml(envelope));
  });
});

describe("error YAML and configuration", () => {
  test("renders the missing-key contract exactly without exposing a key", () => {
    expect(renderErrorYaml(new MissingApiKeyError())).toBe(
      [
        "error:",
        "  code: missing_api_key",
        "  message: CFBD_API_KEY is required.",
        "  hint: Set CFBD_API_KEY in your environment or .env file.",
        "",
      ].join("\n"),
    );
  });

  test("renders structured status, command, query, and deterministic hint", () => {
    const error = new CliError({
      code: "cfbd_bad_request",
      status: 400,
      message: "year is required when id is not specified",
      command: "games",
      query: { team: "Florida State", seasonType: null },
      hint: "Supply --year or query a game with --id.",
    });

    expect(parse(renderErrorYaml(error))).toEqual({
      error: {
        code: "cfbd_bad_request",
        status: 400,
        message: "year is required when id is not specified",
        command: "games",
        query: { team: "Florida State" },
        hint: "Supply --year or query a game with --id.",
      },
    });
  });

  test("redacts credentials from rendered messages", () => {
    const secret = "do-not-print-this-key";
    const message = `Failed with Bearer ${secret}; CFBD_API_KEY=${secret}`;
    const rendered = renderErrorYaml(
      new CliError({ code: "unexpected_error", message }),
    );

    expect(rendered).not.toContain(secret);
    expect(parse(rendered).error.message).toContain("[REDACTED]");
    expect(redactSensitive(`Authorization: Bearer ${secret}`)).not.toContain(
      secret,
    );
  });

  test("writes only YAML to an injected stderr", () => {
    const error = new MissingApiKeyError();
    let stderr = "";
    printErrorYaml(error, (value) => {
      stderr += value;
    });

    expect(stderr).toBe(renderErrorYaml(error));
  });

  test("requires a nonblank key but returns a trimmed key", () => {
    expect(() => getApiKey({})).toThrow(MissingApiKeyError);
    expect(() => getApiKey({ CFBD_API_KEY: "   " })).toThrow(
      MissingApiKeyError,
    );
    expect(getApiKey({ CFBD_API_KEY: "  local-test-key  " })).toBe(
      "local-test-key",
    );
  });

  test("normalizes unknown errors without stack output", () => {
    const normalized = asCliError(new Error("ordinary failure"));

    expect(normalized).toMatchObject({
      code: "unexpected_error",
      message: "ordinary failure",
      exitCode: 1,
    });
    expect(renderErrorYaml(normalized)).not.toContain("at ");
  });
});

describe("CFBD response error translation", () => {
  test("returns successful response data", async () => {
    const data = [{ id: 52 }];

    await expect(
      executeCfbd(async () => ({
        data,
        error: undefined,
        response: new Response(null, { status: 200 }),
      })),
    ).resolves.toBe(data);
  });

  test("preserves provider messages and maps status codes", async () => {
    await expect(
      executeCfbd(async () => ({
        data: undefined,
        error: { message: "year is required" },
        response: new Response(null, { status: 400, statusText: "Bad Request" }),
      })),
    ).rejects.toMatchObject({
      code: "cfbd_bad_request",
      status: 400,
      message: "year is required",
      exitCode: 1,
    });
  });

  test.each([
    [401, "cfbd_unauthorized", "Verify that CFBD_API_KEY is valid and active."],
    [403, "cfbd_forbidden", "Your CFBD subscription tier may not authorize this endpoint."],
    [404, "cfbd_not_found", undefined],
    [429, "cfbd_rate_limited", "Wait for the CFBD quota window to reset, or inspect it with fbs info usage."],
    [500, "cfbd_server_error", undefined],
  ])("maps HTTP %i to %s", async (status, code, hint) => {
    const assertion = expect(
      executeCfbd(async () => ({
        data: undefined,
        error: { message: "provider failure" },
        response: new Response(null, { status: status as number }),
      })),
    ).rejects.toMatchObject({
      code,
      status,
      message: "provider failure",
      ...(hint === undefined ? {} : { hint }),
    });

    await assertion;
  });

  test("recognizes a subscription-tier denial returned as HTTP 401", async () => {
    await expect(
      executeCfbd(async () => ({
        data: undefined,
        error: {
          message:
            "Unauthorized. This endpoint requires a Patreon subscription at Tier 1 or higher.",
        },
        response: new Response(null, { status: 401 }),
      })),
    ).rejects.toMatchObject({
      code: "cfbd_unauthorized",
      status: 401,
      hint: "This endpoint requires a higher CFBD subscription tier.",
    });
  });

  test("normalizes thrown transport failures and redacts credentials", async () => {
    const secret = "transport-secret";

    try {
      await executeCfbd<never>(async () => {
        throw new Error(`socket failed using Bearer ${secret}`);
      });
      throw new Error("Expected executeCfbd to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CfbdRequestError);
      expect(error).toMatchObject({
        code: "network_error",
        hint: "Check network connectivity and try again.",
      });
      expect((error as Error).message).not.toContain(secret);
    }
  });
});

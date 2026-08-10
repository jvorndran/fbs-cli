import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import { asCliError } from "../src/errors";
import { renderErrorYaml } from "../src/output/error";
import { renderAgentYaml } from "../src/output/yaml";
import { runEndpoint, type CommandRuntime } from "../src/runtime";

function createRuntime(maxOutputChars: number): {
  runtime: CommandRuntime;
  streams: { stdout: string; stderr: string };
} {
  const streams = { stdout: "", stderr: "" };
  return {
    runtime: {
      getApi: () => ({}) as CfbdApi,
      getMaxOutputChars: () => maxOutputChars,
      io: {
        stdout: (value) => {
          streams.stdout += value;
        },
        stderr: (value) => {
          streams.stderr += value;
        },
      },
    },
    streams,
  };
}

describe("agent-safe output budgets", () => {
  const envelope = {
    command: "example",
    endpoint: "/example",
    query: { year: 2026 },
    filters: { city: "Tallahassee" },
    count: 1,
    values: [{ name: "🦊" }],
  };
  const rendered = renderAgentYaml(envelope);

  test("accepts a document exactly at its Unicode code-point boundary", async () => {
    const { runtime, streams } = createRuntime(Array.from(rendered).length);

    await runEndpoint(runtime, {
      command: "example",
      endpoint: "/example",
      query: { year: 2026 },
      filters: { city: "Tallahassee" },
      resultKey: "values",
      request: async () => [{ name: "🦊" }, { name: "omit" }],
      transform: (response) => response,
      filter: (rows) => rows.filter((row) => row.name === "🦊"),
    });

    expect(streams.stdout).toBe(rendered);
    expect(parse(streams.stdout)).toEqual({
      command: "example",
      endpoint: "/example",
      query: { year: 2026 },
      filters: { city: "Tallahassee" },
      count: 1,
      values: [{ name: "🦊" }],
    });
  });

  test("emits a stderr-only structured error one code point over the budget", async () => {
    const { runtime, streams } = createRuntime(Array.from(rendered).length - 1);

    let caught: unknown;
    try {
      await runEndpoint(runtime, {
        command: "example",
        endpoint: "/example",
        query: { year: 2026 },
        filters: { city: "Tallahassee" },
        resultKey: "values",
        request: async () => [{ name: "🦊" }],
        transform: (response) => response,
      });
    } catch (error) {
      caught = error;
    }

    expect(asCliError(caught)).toMatchObject({ code: "output_too_large", exitCode: 2 });

    expect(streams.stdout).toBe("");
    const error = parse(renderErrorYaml(asCliError(caught)));
    expect(error).toEqual({
      error: {
        code: "output_too_large",
        message: "The rendered YAML exceeds FBS_MAX_OUTPUT_CHARS.",
        command: "example",
        query: { year: 2026 },
        filters: { city: "Tallahassee" },
        output_characters: Array.from(rendered).length,
        max_output_characters: Array.from(rendered).length - 1,
        hint: "Narrow the query or local filters, or raise FBS_MAX_OUTPUT_CHARS.",
      },
    });
  });

  test("zero explicitly disables the budget", async () => {
    const { runtime, streams } = createRuntime(0);
    await runEndpoint(runtime, {
      command: "example",
      endpoint: "/example",
      query: {},
      resultKey: "values",
      request: async () => [{ value: "x".repeat(30_000) }],
      transform: (response) => response,
    });
    expect(streams.stdout.length).toBeGreaterThan(30_000);
  });
});

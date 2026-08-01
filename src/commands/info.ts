import { Option, type Command } from "commander";

import {
  buildUsageQuery,
  type UsageQuery,
  validateUsageQuery,
} from "../cfbd/query-builders";
import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildNoQuery,
  validateNoQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformUserInfo } from "../transformers/reference-endpoints.ts";
import { transformUsage } from "../transformers/usage.ts";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerInfoCommand(program: Command, runtime: CommandRuntime): void {
  const info = program
    .command("info")
    .description("Retrieve authenticated account and feature information")
    .addHelpText("after", "\nExample:\n  fbs info\n")
    .action(async () => {
      const rawQuery = buildNoQuery();

      await withCommandContext("info", rawQuery, async () => {
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "info",
          endpoint: "/info",
          query: asQueryRecord(query),
          resultKey: "info",
          request: (api) => asReferenceCfbdApi(api).userInfo(),
          transform: transformUserInfo,
        });
      });
    });

  const usage = info
    .command("usage")
    .description("Retrieve bounded API usage for the shared CFB/CBB call pool")
    .addOption(
      new Option("--api <all|cfb|cbb>", "API product filter").choices([
        "all",
        "cfb",
        "cbb",
      ]),
    )
    .option("--days <number>", "Trailing days (1-31)", parseInteger)
    .option("--limit <number>", "Endpoint and request rows (1-50)", parseInteger)
    .addHelpText(
      "after",
      "\nExamples:\n  fbs info usage\n  fbs info usage --api cfb --days 7 --limit 10\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<UsageQuery>>(command);
      const rawQuery = buildUsageQuery(options);

      await withCommandContext("info usage", rawQuery, async () => {
        const query = validateUsageQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "info usage",
          endpoint: "/info/usage",
          query: asQueryRecord(query),
          resultKey: "usage",
          request: (api) => api.usage(query),
          transform: transformUsage,
        });
      });
    });

  usage.allowExcessArguments(false);
  info.allowExcessArguments(false);
}

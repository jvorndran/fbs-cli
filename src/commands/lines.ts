import type { Command } from "commander";

import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildLinesQuery,
  type LinesQuery,
  validateLinesQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformLines } from "../transformers/reference-endpoints.ts";
import { addSeasonTypeOption, parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerLinesCommand(
  program: Command,
  runtime: CommandRuntime,
): void {
  const lines = program
    .command("lines")
    .description("Retrieve historical betting lines")
    .option("--game-id <number>", "Game ID", parseInteger)
    .option("--year <number>", "Season year; required without --game-id", parseInteger);

  addSeasonTypeOption(lines);
  lines
    .option("--week <number>", "Season week", parseInteger)
    .option("--team <name>", "Either team")
    .option("--home <name>", "Home team")
    .option("--away <name>", "Away team")
    .option("--conference <value>", "Conference abbreviation")
    .option("--provider <name>", "Betting line provider")
    .addHelpText(
      "after",
      "\nHistorical, read-only data. Supply --year or --game-id.\n\nExamples:\n  fbs lines --year 2024 --week 1 --team \"Florida State\"\n  fbs lines --game-id 401628334 --provider consensus\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<LinesQuery>>(command);
      const rawQuery = buildLinesQuery(options);

      await withCommandContext("lines", rawQuery, async () => {
        const query = validateLinesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "lines",
          endpoint: "/lines",
          query: asQueryRecord(query),
          resultKey: "lines",
          request: (api) => asReferenceCfbdApi(api).lines(query),
          transform: transformLines,
        });
      });
    })
    .allowExcessArguments(false);
}

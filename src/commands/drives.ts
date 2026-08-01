import type { Command } from "commander";

import {
  buildDrivesQuery,
  type DrivesQuery,
  validateDrivesQuery,
} from "../cfbd/query-builders";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformDrives } from "../transformers/drives.ts";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerDrivesCommand(program: Command, runtime: CommandRuntime): void {
  const drives = program
    .command("drives")
    .description("Retrieve historical drive data")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Either participating team")
    .option("--offense <name>", "Offensive team")
    .option("--defense <name>", "Defensive team")
    .option("--conference <value>", "Either participating conference")
    .option("--offense-conference <value>", "Offensive conference")
    .option("--defense-conference <value>", "Defensive conference");

  addSeasonTypeOption(drives);
  addClassificationOption(drives);
  drives
    .addHelpText(
      "after",
      "\nExamples:\n  fbs drives --year 2026 --team \"Florida State\" --week 1\n  fbs drives --year 2026 --offense \"Florida State\" --defense Miami\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<DrivesQuery>>(command);
      const rawQuery = buildDrivesQuery(options);

      await withCommandContext("drives", rawQuery, async () => {
        const query = validateDrivesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "drives",
          endpoint: "/drives",
          query: asQueryRecord(query),
          resultKey: "drives",
          request: (api) => api.drives(query),
          transform: transformDrives,
        });
      });
    })
    .allowExcessArguments(false);
}

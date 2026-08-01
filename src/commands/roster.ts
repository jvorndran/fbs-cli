import type { Command } from "commander";

import {
  buildRosterQuery,
  type RosterQuery,
  validateRosterQuery,
} from "../cfbd/query-builders";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformRoster } from "../transformers/roster.ts";
import { addClassificationOption, parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerRosterCommand(program: Command, runtime: CommandRuntime): void {
  const roster = program
    .command("roster")
    .description("Retrieve historical team rosters")
    .option("--year <number>", "Season year", parseInteger)
    .option("--team <name>", "Team name");

  addClassificationOption(roster);
  roster
    .addHelpText(
      "after",
      "\nExamples:\n  fbs roster --year 2026 --team \"Florida State\"\n  fbs roster --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RosterQuery>>(command);
      const rawQuery = buildRosterQuery(options);

      await withCommandContext("roster", rawQuery, async () => {
        const query = validateRosterQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "roster",
          endpoint: "/roster",
          query: asQueryRecord(query),
          resultKey: "players",
          request: (api) => api.roster(query),
          transform: transformRoster,
        });
      });
    })
    .allowExcessArguments(false);
}

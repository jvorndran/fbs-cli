import { Option, type Command } from "commander";

import {
  buildRankingsQuery,
  type RankingsQuery,
  validateRankingsQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformRankings } from "../transformers/analytics-rankings";
import { asAnalyticsApi } from "./analytics-shared";
import { addSeasonTypeOption, parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerRankingsCommand(program: Command, runtime: CommandRuntime): void {
  const rankings = program
    .command("rankings")
    .description("Retrieve historical poll rankings")
    .option("--final", "Return the marked final CFP snapshot")
    .option("--latest", "Return the latest CFP snapshot")
    .addOption(new Option("--poll <value>", "Poll name").choices(["cfp"]))
    .option("--week <number>", "Poll week, including 0", parseInteger)
    .option("--year <number>", "Season year", parseInteger);
  addSeasonTypeOption(rankings);
  rankings
    .addHelpText(
      "after",
      "\n--year is required.\n\nExamples:\n  fbs rankings --year 2025\n  fbs rankings --year 2025 --poll cfp --latest\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<RankingsQuery>>(command, [
        "final",
        "latest",
      ]);
      const rawQuery = buildRankingsQuery(options);
      await withCommandContext("rankings", rawQuery, async () => {
        const query = validateRankingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "rankings",
          endpoint: "/rankings",
          query: asQueryRecord(query),
          resultKey: "rankings",
          request: (api) => asAnalyticsApi(api).rankings(query),
          transform: transformRankings,
        });
      });
    })
    .allowExcessArguments(false);
}

import type { Command } from "commander";

import {
  buildPlayStatsQuery,
  buildPlaysQuery,
  type PlayStatsQuery,
  type PlaysQuery,
  validatePlayStatsQuery,
  validatePlaysQuery,
} from "../cfbd/query-builders";
import {
  buildNoQuery,
  type NoQuery,
  validateNoQuery,
} from "../cfbd/query-builders-reference";
import { asReferenceCfbdApi } from "../cfbd/api-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformPlays } from "../transformers/plays.ts";
import { transformPlayStats } from "../transformers/play-stats.ts";
import {
  transformPlayStatTypes,
  transformPlayTypes,
} from "../transformers/reference-endpoints.ts";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerPlayStatsCommand(plays: Command, runtime: CommandRuntime): void {
  const stats = plays
    .command("stats")
    .description("Retrieve player-play statistical associations (maximum 2,000 records)")
    .option("--game-id <number>", "Game ID", parseInteger)
    .option("--athlete-id <number>", "Athlete ID", parseInteger)
    .option("--stat-type-id <number>", "Play stat type ID", parseInteger)
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name")
    .option("--conference <value>", "Conference abbreviation");

  addSeasonTypeOption(stats);
  stats
    .addHelpText(
      "after",
      "\nExamples:\n  fbs plays stats --game-id 401752731\n  fbs plays stats --year 2026 --week 1 --team \"Florida State\"\n  fbs plays stats --athlete-id 4433971 --stat-type-id 1\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<PlayStatsQuery>>(command);
      const rawQuery = buildPlayStatsQuery(options);

      await withCommandContext("plays stats", rawQuery, async () => {
        const query = validatePlayStatsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "plays stats",
          endpoint: "/plays/stats",
          query: asQueryRecord(query),
          resultKey: "play_stats",
          request: (api) => api.playStats(query),
          transform: transformPlayStats,
        });
      });
    })
    .allowExcessArguments(false);

  const types = stats
    .command("types")
    .description("List player-play statistic types")
    .addHelpText("after", "\nExample:\n  fbs plays stats types\n")
    .action(async (_options: unknown, command: Command) => {
      suppliedLeafOptions<NoQuery>(command);
      const rawQuery = buildNoQuery();

      await withCommandContext("plays stats types", rawQuery, async () => {
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "plays stats types",
          endpoint: "/plays/stats/types",
          query: asQueryRecord(query),
          resultKey: "play_stat_types",
          request: (api) => asReferenceCfbdApi(api).playStatTypes(),
          transform: transformPlayStatTypes,
        });
      });
    });

  types.allowExcessArguments(false);
}

function registerPlayTypesCommand(plays: Command, runtime: CommandRuntime): void {
  const types = plays
    .command("types")
    .description("List play types")
    .addHelpText("after", "\nExample:\n  fbs plays types\n")
    .action(async (_options: unknown, command: Command) => {
      suppliedLeafOptions<NoQuery>(command);
      const rawQuery = buildNoQuery();

      await withCommandContext("plays types", rawQuery, async () => {
        const query = validateNoQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "plays types",
          endpoint: "/plays/types",
          query: asQueryRecord(query),
          resultKey: "play_types",
          request: (api) => asReferenceCfbdApi(api).playTypes(),
          transform: transformPlayTypes,
        });
      });
    });

  types.allowExcessArguments(false);
}

export function registerPlaysCommand(program: Command, runtime: CommandRuntime): void {
  const plays = program
    .command("plays")
    .description("Retrieve historical play-by-play data")
    .option("--year <number>", "Season year (required)", parseInteger)
    .option("--week <number>", "Week, including 0 (required)", parseInteger)
    .option("--team <name>", "Either participating team")
    .option("--offense <name>", "Offensive team")
    .option("--defense <name>", "Defensive team")
    .option("--conference <value>", "Either participating conference")
    .option("--offense-conference <value>", "Offensive conference")
    .option("--defense-conference <value>", "Defensive conference")
    .option("--play-type <value>", "Play type abbreviation or name");

  addSeasonTypeOption(plays);
  addClassificationOption(plays);
  plays
    .addHelpText(
      "after",
      "\nBoth --year and --week are required.\n\nExamples:\n  fbs plays --year 2026 --week 1 --team \"Florida State\"\n  fbs plays --year 2026 --week 1 --offense \"Florida State\" --play-type Rush\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<PlaysQuery>>(command);
      const rawQuery = buildPlaysQuery(options);

      await withCommandContext("plays", rawQuery, async () => {
        const query = validatePlaysQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "plays",
          endpoint: "/plays",
          query: asQueryRecord(query),
          resultKey: "plays",
          request: (api) => api.plays(query),
          transform: transformPlays,
        });
      });
    })
    .allowExcessArguments(false);

  registerPlayStatsCommand(plays, runtime);
  registerPlayTypesCommand(plays, runtime);
}

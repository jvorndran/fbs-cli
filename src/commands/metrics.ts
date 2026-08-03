import type { Command } from "commander";

import { asStatisticsCfbdApi } from "../cfbd/api-statistics";
import {
  buildPregameWinProbabilitiesQuery,
  buildWinProbabilityQuery,
  type PregameWinProbabilitiesQuery,
  type WinProbabilityQuery,
  validatePregameWinProbabilitiesQuery,
  validateWinProbabilityQuery,
} from "../cfbd/query-builders-statistics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformFieldGoalExpectedPoints,
  transformPregameWinProbabilities,
  transformWinProbability,
} from "../transformers/metrics.ts";
import {
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerPregameWinProbabilities(
  wp: Command,
  runtime: CommandRuntime,
): void {
  const pregame = wp
    .command("pregame")
    .description("Retrieve pregame win probabilities")
    .option("--year <number>", "Season year", parseInteger)
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--team <name>", "Team name");

  addSeasonTypeOption(pregame);
  pregame
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs metrics wp pregame\n  fbs metrics wp pregame --year 2026 --week 1 --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<PregameWinProbabilitiesQuery>>(command);
      const rawQuery = buildPregameWinProbabilitiesQuery(options);

      await withCommandContext("metrics wp pregame", rawQuery, async () => {
        const query = validatePregameWinProbabilitiesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "metrics wp pregame",
          endpoint: "/metrics/wp/pregame",
          query: asQueryRecord(query),
          resultKey: "pregame_win_probabilities",
          request: (api) =>
            asStatisticsCfbdApi(api).pregameWinProbabilities(query),
          transform: transformPregameWinProbabilities,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerWinProbability(metrics: Command, runtime: CommandRuntime): void {
  const wp = metrics
    .command("wp")
    .description("Retrieve play-by-play win probability values")
    .option("--game-id <number>", "Game ID (required)", parseInteger)
    .addHelpText(
      "after",
      "\n--game-id is required.\n\nExample:\n  fbs metrics wp --game-id 401752731\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<WinProbabilityQuery>>(command);
      const rawQuery = buildWinProbabilityQuery(options);

      await withCommandContext("metrics wp", rawQuery, async () => {
        const query = validateWinProbabilityQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "metrics wp",
          endpoint: "/metrics/wp",
          query: asQueryRecord(query),
          resultKey: "win_probability",
          request: (api) => asStatisticsCfbdApi(api).winProbability(query),
          transform: transformWinProbability,
        });
      });
    })
    .allowExcessArguments(false);

  registerPregameWinProbabilities(wp, runtime);
}

function registerFieldGoalExpectedPoints(
  metrics: Command,
  runtime: CommandRuntime,
): void {
  const fg = metrics.command("fg").description("Field-goal metrics");
  fg.action((_options: unknown, command: Command) => command.outputHelp());
  fg
    .command("ep")
    .description("Retrieve field-goal expected points values")
    .addHelpText("after", "\nExample:\n  fbs metrics fg ep\n")
    .action(async () => {
      const query = {};
      await withCommandContext("metrics fg ep", query, async () => {
        await runEndpoint(runtime, {
          command: "metrics fg ep",
          endpoint: "/metrics/fg/ep",
          query,
          resultKey: "field_goal_expected_points",
          request: (api) => asStatisticsCfbdApi(api).fieldGoalExpectedPoints(),
          transform: transformFieldGoalExpectedPoints,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerMetricsCommand(
  program: Command,
  runtime: CommandRuntime,
): void {
  const metrics = program.command("metrics").description("Probability metrics");
  metrics.action((_options: unknown, command: Command) => command.outputHelp());
  registerWinProbability(metrics, runtime);
  registerFieldGoalExpectedPoints(metrics, runtime);
}

import { Option, type Command } from "commander";

import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildCfpGamesQuery,
  buildCfpParticipantsQuery,
  buildCfpPlayoffQuery,
  type CfpGamesQuery,
  type CfpParticipantsQuery,
  type CfpPlayoffQuery,
  validateCfpGamesQuery,
  validateCfpParticipantsQuery,
  validateCfpPlayoffQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformCfpGames,
  transformCfpParticipants,
  transformCfpPlayoff,
} from "../transformers/reference-endpoints.ts";
import { parseInteger, suppliedLeafOptions, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerPlayoffsCommand(
  program: Command,
  runtime: CommandRuntime,
): void {
  const playoffs = program.command("playoffs").description("Playoff resources");
  playoffs.action((_options: unknown, command: Command) => command.outputHelp());

  const cfp = playoffs
    .command("cfp")
    .description("Retrieve the College Football Playoff bracket")
    .option("--year <number>", "Season year (required)", parseInteger)
    .addHelpText("after", "\nExample:\n  fbs playoffs cfp --year 2025\n")
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CfpPlayoffQuery>>(command);
      const rawQuery = buildCfpPlayoffQuery(options);

      await withCommandContext("playoffs cfp", rawQuery, async () => {
        const query = validateCfpPlayoffQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "playoffs cfp",
          endpoint: "/playoffs/cfp",
          query: asQueryRecord(query),
          resultKey: "playoff",
          request: (api) => asReferenceCfbdApi(api).cfpPlayoff(query),
          transform: transformCfpPlayoff,
        });
      });
    });

  const participants = cfp
    .command("participants")
    .description("Retrieve College Football Playoff participants")
    .option("--year <number>", "Season year (required)", parseInteger)
    .addHelpText(
      "after",
      "\nExample:\n  fbs playoffs cfp participants --year 2025\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<CfpParticipantsQuery>>(command);
      const rawQuery = buildCfpParticipantsQuery(options);

      await withCommandContext("playoffs cfp participants", rawQuery, async () => {
        const query = validateCfpParticipantsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "playoffs cfp participants",
          endpoint: "/playoffs/cfp/participants",
          query: asQueryRecord(query),
          resultKey: "participants",
          request: (api) => asReferenceCfbdApi(api).cfpParticipants(query),
          transform: transformCfpParticipants,
        });
      });
    });

  const games = cfp
    .command("games")
    .description("Retrieve College Football Playoff bracket matchups")
    .option("--year <number>", "Season year (required)", parseInteger)
    .addOption(
      new Option("--round <value>", "Playoff round").choices([
        "first_round",
        "quarterfinal",
        "semifinal",
        "championship",
      ]),
    )
    .addHelpText(
      "after",
      "\nExamples:\n  fbs playoffs cfp games --year 2025\n  fbs playoffs cfp games --year 2025 --round semifinal\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<CfpGamesQuery>>(command);
      const rawQuery = buildCfpGamesQuery(options);

      await withCommandContext("playoffs cfp games", rawQuery, async () => {
        const query = validateCfpGamesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "playoffs cfp games",
          endpoint: "/playoffs/cfp/games",
          query: asQueryRecord(query),
          resultKey: "games",
          request: (api) => asReferenceCfbdApi(api).cfpGames(query),
          transform: transformCfpGames,
        });
      });
    });

  participants.allowExcessArguments(false);
  games.allowExcessArguments(false);
  cfp.allowExcessArguments(false);
  playoffs.allowExcessArguments(false);
}

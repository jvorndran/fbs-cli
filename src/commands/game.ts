import type { Command } from "commander";

import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildAdvancedBoxScoreQuery,
  type AdvancedBoxScoreQuery,
  validateAdvancedBoxScoreQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformAdvancedBoxScore } from "../transformers/reference-endpoints.ts";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerGameCommand(program: Command, runtime: CommandRuntime): void {
  const game = program.command("game").description("Single-game resources");
  game.action((_options: unknown, command: Command) => command.outputHelp());

  const box = game.command("box").description("Single-game box score resources");
  box.action((_options: unknown, command: Command) => command.outputHelp());

  const advanced = box
    .command("advanced")
    .description("Retrieve an advanced game box score")
    .option("--id <number>", "Game ID (required)", parseInteger)
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExample:\n  fbs game box advanced --id 401752731\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<AdvancedBoxScoreQuery>>(command);
      const rawQuery = buildAdvancedBoxScoreQuery(options);

      await withCommandContext("game box advanced", rawQuery, async () => {
        const query = validateAdvancedBoxScoreQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "game box advanced",
          endpoint: "/game/box/advanced",
          query: asQueryRecord(query),
          resultKey: "box_score",
          request: (api) => asReferenceCfbdApi(api).advancedBoxScore(query),
          transform: transformAdvancedBoxScore,
        });
      });
    });

  advanced.allowExcessArguments(false);
  box.allowExcessArguments(false);
  game.allowExcessArguments(false);
}

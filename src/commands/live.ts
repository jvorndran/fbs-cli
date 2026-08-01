import type { Command } from "commander";

import { asReferenceCfbdApi } from "../cfbd/api-reference";
import {
  buildLivePlaysQuery,
  type LivePlaysQuery,
  validateLivePlaysQuery,
} from "../cfbd/query-builders-reference";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import { transformLivePlays } from "../transformers/reference-endpoints.ts";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerLiveCommand(program: Command, runtime: CommandRuntime): void {
  const live = program.command("live").description("Live game resources");
  live.action((_options: unknown, command: Command) => command.outputHelp());

  const plays = live
    .command("plays")
    .description("Retrieve live game state and play-by-play")
    .option("--game-id <number>", "Game ID (required)", parseInteger)
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExample:\n  fbs live plays --game-id 401752731\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<LivePlaysQuery>>(command);
      const rawQuery = buildLivePlaysQuery(options);

      await withCommandContext("live plays", rawQuery, async () => {
        const query = validateLivePlaysQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "live plays",
          endpoint: "/live/plays",
          query: asQueryRecord(query),
          resultKey: "live_game",
          request: (api) => asReferenceCfbdApi(api).livePlays(query),
          transform: transformLivePlays,
        });
      });
    });

  plays.allowExcessArguments(false);
  live.allowExcessArguments(false);
}

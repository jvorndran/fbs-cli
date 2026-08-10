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
import {
  filterRows,
  isObject,
  localFilters,
  stringMatches,
  valueAt,
} from "./local-filters";
import type { AgentObject, AgentValue } from "../transformers/common";
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
    .option("--team <name>", "Local filter: team")
    .option("--player <name>", "Local filter: player")
    .option("--position <value>", "Local filter: player position")
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExample:\n  fbs game box advanced --id 401752731\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { team, player, position, ...options } = suppliedOptions<
        Partial<AdvancedBoxScoreQuery> & {
          team?: string;
          player?: string;
          position?: string;
        }
      >(command);
      const filters = localFilters({ team, player, position });
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
          ...(filters === undefined ? {} : { filters }),
          filter: (boxScore) => {
            const filterMetricGroups = (
              value: AgentValue,
              predicate: (metric: Record<string, unknown>) => boolean,
            ): AgentValue => {
              if (!isObject(value)) return value;
              return Object.fromEntries(
                Object.entries(value).map(([key, metrics]) => [
                  key,
                  Array.isArray(metrics)
                    ? filterRows(metrics, (metric) => isObject(metric) && predicate(metric))
                    : metrics,
                ]),
              ) as AgentObject;
            };
            return {
              ...boxScore,
              teams: filterMetricGroups(boxScore.teams ?? {}, (metric) =>
                stringMatches(valueAt(metric, "team"), filters?.team as string | undefined),
              ),
              players: filterMetricGroups(boxScore.players ?? {}, (metric) =>
                stringMatches(valueAt(metric, "team"), filters?.team as string | undefined) &&
                stringMatches(valueAt(metric, "player"), filters?.player as string | undefined) &&
                stringMatches(valueAt(metric, "position"), filters?.position as string | undefined),
              ),
            };
          },
        });
      });
    });

  advanced.allowExcessArguments(false);
  box.allowExcessArguments(false);
  game.allowExcessArguments(false);
}

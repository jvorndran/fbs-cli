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
import {
  booleanMatches,
  isObject,
  localFilters,
  parseBoolean,
  parseNonNegativeInteger,
  stringMatches,
  valueAt,
} from "./local-filters";
import { asQueryRecord, withCommandContext } from "./shared";

export function registerLiveCommand(program: Command, runtime: CommandRuntime): void {
  const live = program.command("live").description("Live game resources");
  live.action((_options: unknown, command: Command) => command.outputHelp());

  const plays = live
    .command("plays")
    .description("Retrieve live game state and play-by-play")
    .option("--game-id <number>", "Game ID (required)", parseInteger)
    .option("--team <name>", "Local filter: play team")
    .option("--period <number>", "Local filter: period", parseNonNegativeInteger)
    .option("--play-type <value>", "Local filter: play type")
    .option("--scoring <boolean>", "Local filter: scoring plays", parseBoolean)
    .option("--success <boolean>", "Local filter: successful plays", parseBoolean)
    .option("--rush-pass <value>", "Local filter: rush, pass, or other")
    .option("--garbage-time <boolean>", "Local filter: garbage-time plays", parseBoolean)
    .addHelpText(
      "after",
      "\nThis endpoint may require an eligible CFBD subscription tier.\n\nExample:\n  fbs live plays --game-id 401752731\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const {
        team,
        period,
        playType,
        scoring,
        success,
        rushPass,
        garbageTime,
        ...options
      } = suppliedOptions<
        Partial<LivePlaysQuery> & {
          team?: string;
          period?: number;
          playType?: string;
          scoring?: boolean;
          success?: boolean;
          rushPass?: string;
          garbageTime?: boolean;
        }
      >(command);
      const filters = localFilters({
        team,
        period,
        playType,
        scoring,
        success,
        rushPass,
        garbageTime,
      });
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
          ...(filters === undefined ? {} : { filters }),
          filter: (liveGame) => {
            let previousHomeScore: number | undefined;
            let previousAwayScore: number | undefined;
            const drives = Array.isArray(liveGame.drives)
              ? liveGame.drives.flatMap((drive) => {
                  if (!isObject(drive)) return [];
                  const drivePlays = drive.plays;
                  if (!Array.isArray(drivePlays)) return [];
                  const plays = drivePlays.filter((play, index) => {
                    if (!isObject(play)) return false;
                    const homeScore = valueAt(play, "home_score");
                    const awayScore = valueAt(play, "away_score");
                    const observedScoring =
                      typeof valueAt(play, "scoring") === "boolean"
                        ? valueAt(play, "scoring")
                        : (typeof homeScore === "number" &&
                            typeof awayScore === "number" &&
                            ((previousHomeScore !== undefined && homeScore !== previousHomeScore) ||
                              (previousAwayScore !== undefined && awayScore !== previousAwayScore))) ||
                          (index === drivePlays.length - 1 &&
                            typeof valueAt(drive, "points_gained") === "number" &&
                            valueAt(drive, "points_gained") !== 0);
                    if (typeof homeScore === "number") previousHomeScore = homeScore;
                    if (typeof awayScore === "number") previousAwayScore = awayScore;
                    return (
                      stringMatches(valueAt(play, "team"), filters?.team as string | undefined) &&
                      (filters?.period === undefined || valueAt(play, "period") === filters.period) &&
                      stringMatches(valueAt(play, "play_type"), filters?.playType as string | undefined) &&
                      booleanMatches(observedScoring, filters?.scoring as boolean | undefined) &&
                      booleanMatches(valueAt(play, "success"), filters?.success as boolean | undefined) &&
                      stringMatches(valueAt(play, "rush_pass"), filters?.rushPass as string | undefined) &&
                      booleanMatches(
                        valueAt(play, "garbage_time"),
                        filters?.garbageTime as boolean | undefined,
                      )
                    );
                  });
                  return plays.length === 0 ? [] : [{ ...drive, plays }];
                })
              : [];
            return { ...liveGame, drives };
          },
        });
      });
    });

  plays.allowExcessArguments(false);
  live.allowExcessArguments(false);
}

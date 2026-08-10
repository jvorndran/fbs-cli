import type { Command } from "commander";

import {
  buildDraftPicksQuery,
  type DraftPicksQuery,
  validateDraftPicksQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformDraftPicks,
  transformDraftPositions,
  transformDraftTeams,
} from "../transformers/analytics-draft";
import { asAnalyticsApi } from "./analytics-shared";
import {
  filterRows,
  localFilters,
  numberMatches,
  parseNonNegativeInteger,
  validateOrderedRange,
  valueAt,
} from "./local-filters";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerTeams(draft: Command, runtime: CommandRuntime): void {
  draft
    .command("teams")
    .description("Retrieve NFL draft teams")
    .addHelpText("after", "\nExample:\n  fbs draft teams\n")
    .action(async () => {
      const query = {};
      await withCommandContext("draft teams", query, async () => {
        await runEndpoint(runtime, {
          command: "draft teams",
          endpoint: "/draft/teams",
          query,
          resultKey: "draft_teams",
          request: (api) => asAnalyticsApi(api).draftTeams(),
          transform: transformDraftTeams,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPositions(draft: Command, runtime: CommandRuntime): void {
  draft
    .command("positions")
    .description("Retrieve NFL draft position categories")
    .addHelpText("after", "\nExample:\n  fbs draft positions\n")
    .action(async () => {
      const query = {};
      await withCommandContext("draft positions", query, async () => {
        await runEndpoint(runtime, {
          command: "draft positions",
          endpoint: "/draft/positions",
          query,
          resultKey: "draft_positions",
          request: (api) => asAnalyticsApi(api).draftPositions(),
          transform: transformDraftPositions,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerPicks(draft: Command, runtime: CommandRuntime): void {
  const picks = draft
    .command("picks")
    .description("Retrieve historical NFL draft picks")
    .option("--conference <value>", "College conference")
    .option("--position <value>", "Position category")
    .option("--school <name>", "College team")
    .option("--team <name>", "NFL team")
    .option("--year <number>", "Draft year", parseInteger)
    .option("--round <number>", "Local filter: draft round", parseNonNegativeInteger)
    .option("--min-overall <number>", "Local filter: minimum overall pick", parseNonNegativeInteger)
    .option("--max-overall <number>", "Local filter: maximum overall pick", parseNonNegativeInteger);
  picks
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs draft picks --year 2025\n  fbs draft picks --school \"Florida State\" --position QB\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const { round, minOverall, maxOverall, ...options } = suppliedOptions<
        Partial<DraftPicksQuery> & {
          round?: number;
          minOverall?: number;
          maxOverall?: number;
        }
      >(command);
      validateOrderedRange(minOverall, maxOverall, "min-overall", "max-overall");
      const filters = localFilters({ round, minOverall, maxOverall });
      const rawQuery = buildDraftPicksQuery(options);
      await withCommandContext("draft picks", rawQuery, async () => {
        const query = validateDraftPicksQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "draft picks",
          endpoint: "/draft/picks",
          query: asQueryRecord(query),
          resultKey: "draft_picks",
          request: (api) => asAnalyticsApi(api).draftPicks(query),
          transform: transformDraftPicks,
          ...(filters === undefined ? {} : { filters }),
          filter: (rows) =>
            filterRows(
              rows,
              (row) =>
                (filters?.round === undefined || valueAt(row, "round") === filters.round) &&
                numberMatches(
                  valueAt(row, "overall"),
                  filters?.minOverall as number | undefined,
                  filters?.maxOverall as number | undefined,
                ),
            ),
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerDraftCommand(program: Command, runtime: CommandRuntime): void {
  const draft = program.command("draft").description("Retrieve historical NFL draft data");
  draft.action((_options: unknown, command: Command) => command.outputHelp());
  registerTeams(draft, runtime);
  registerPositions(draft, runtime);
  registerPicks(draft, runtime);
}

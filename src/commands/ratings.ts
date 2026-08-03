import type { Command } from "commander";

import {
  buildConferenceSpRatingsQuery,
  buildEloRatingsQuery,
  buildExpandedSrsRatingsQuery,
  buildFpiRatingsQuery,
  buildSpRatingsQuery,
  buildSrsRatingsQuery,
  type ConferenceSpRatingsQuery,
  type EloRatingsQuery,
  type ExpandedSrsRatingsQuery,
  type FpiRatingsQuery,
  type SpRatingsQuery,
  type SrsRatingsQuery,
  validateConferenceSpRatingsQuery,
  validateEloRatingsQuery,
  validateExpandedSrsRatingsQuery,
  validateFpiRatingsQuery,
  validateSpRatingsQuery,
  validateSrsRatingsQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformConferenceSpRatings,
  transformEloRatings,
  transformExpandedSrsRatings,
  transformFpiRatings,
  transformSpRatings,
  transformSrsRatings,
} from "../transformers/analytics-ratings";
import { asAnalyticsApi } from "./analytics-shared";
import {
  addClassificationOption,
  addSeasonTypeOption,
  parseInteger,
  suppliedLeafOptions,
  suppliedOptions,
} from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function registerConferenceSp(sp: Command, runtime: CommandRuntime): void {
  const conferences = sp
    .command("conferences")
    .description("Retrieve historical conference SP+ ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--year <number>", "Season year", parseInteger);
  addClassificationOption(conferences);
  conferences
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs ratings sp conferences --year 2025\n  fbs ratings sp conferences --conference ACC --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<ConferenceSpRatingsQuery>>(command);
      const rawQuery = buildConferenceSpRatingsQuery(options);
      await withCommandContext("ratings sp conferences", rawQuery, async () => {
        const query = validateConferenceSpRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings sp conferences",
          endpoint: "/ratings/sp/conferences",
          query: asQueryRecord(query),
          resultKey: "conference_sp_ratings",
          request: (api) => asAnalyticsApi(api).conferenceSpRatings(query),
          transform: transformConferenceSpRatings,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerSp(ratings: Command, runtime: CommandRuntime): void {
  const sp = ratings
    .command("sp")
    .description("Retrieve SP+ ratings")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
  sp
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings sp --year 2025\n  fbs ratings sp --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<SpRatingsQuery>>(command);
      const rawQuery = buildSpRatingsQuery(options);
      await withCommandContext("ratings sp", rawQuery, async () => {
        const query = validateSpRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings sp",
          endpoint: "/ratings/sp",
          query: asQueryRecord(query),
          resultKey: "sp_ratings",
          request: (api) => asAnalyticsApi(api).spRatings(query),
          transform: transformSpRatings,
        });
      });
    })
    .allowExcessArguments(false);
  registerConferenceSp(sp, runtime);
}

function registerExpandedSrs(srs: Command, runtime: CommandRuntime): void {
  const expanded = srs
    .command("expanded")
    .description("Retrieve expanded SRS ratings, including FCS")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
  addClassificationOption(expanded);
  expanded
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings srs expanded --year 2025\n  fbs ratings srs expanded --team \"Florida State\" --classification fbs\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedLeafOptions<Partial<ExpandedSrsRatingsQuery>>(command);
      const rawQuery = buildExpandedSrsRatingsQuery(options);
      await withCommandContext("ratings srs expanded", rawQuery, async () => {
        const query = validateExpandedSrsRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings srs expanded",
          endpoint: "/ratings/srs/expanded",
          query: asQueryRecord(query),
          resultKey: "expanded_srs_ratings",
          request: (api) => asAnalyticsApi(api).expandedSrsRatings(query),
          transform: transformExpandedSrsRatings,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerSrs(ratings: Command, runtime: CommandRuntime): void {
  const srs = ratings
    .command("srs")
    .description("Retrieve Simple Rating System ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
  srs
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings srs --year 2025\n  fbs ratings srs --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<SrsRatingsQuery>>(command);
      const rawQuery = buildSrsRatingsQuery(options);
      await withCommandContext("ratings srs", rawQuery, async () => {
        const query = validateSrsRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings srs",
          endpoint: "/ratings/srs",
          query: asQueryRecord(query),
          resultKey: "srs_ratings",
          request: (api) => asAnalyticsApi(api).srsRatings(query),
          transform: transformSrsRatings,
        });
      });
    })
    .allowExcessArguments(false);
  registerExpandedSrs(srs, runtime);
}

function registerElo(ratings: Command, runtime: CommandRuntime): void {
  const elo = ratings
    .command("elo")
    .description("Retrieve historical Elo ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--week <number>", "Week, including 0", parseInteger)
    .option("--year <number>", "Season year", parseInteger);
  addSeasonTypeOption(elo);
  elo
    .addHelpText(
      "after",
      "\nAll filters are optional.\n\nExamples:\n  fbs ratings elo --year 2025\n  fbs ratings elo --team \"Florida State\" --week 1\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<EloRatingsQuery>>(command);
      const rawQuery = buildEloRatingsQuery(options);
      await withCommandContext("ratings elo", rawQuery, async () => {
        const query = validateEloRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings elo",
          endpoint: "/ratings/elo",
          query: asQueryRecord(query),
          resultKey: "elo_ratings",
          request: (api) => asAnalyticsApi(api).eloRatings(query),
          transform: transformEloRatings,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerFpi(ratings: Command, runtime: CommandRuntime): void {
  const fpi = ratings
    .command("fpi")
    .description("Retrieve Football Power Index ratings")
    .option("--conference <value>", "Conference abbreviation")
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
  fpi
    .addHelpText(
      "after",
      "\nAt least one of --year or --team is required.\n\nExamples:\n  fbs ratings fpi --year 2025\n  fbs ratings fpi --team \"Florida State\"\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<FpiRatingsQuery>>(command);
      const rawQuery = buildFpiRatingsQuery(options);
      await withCommandContext("ratings fpi", rawQuery, async () => {
        const query = validateFpiRatingsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "ratings fpi",
          endpoint: "/ratings/fpi",
          query: asQueryRecord(query),
          resultKey: "fpi_ratings",
          request: (api) => asAnalyticsApi(api).fpiRatings(query),
          transform: transformFpiRatings,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerRatingsCommand(program: Command, runtime: CommandRuntime): void {
  const ratings = program.command("ratings").description("Retrieve historical ratings");
  ratings.action((_options: unknown, command: Command) => command.outputHelp());
  registerSp(ratings, runtime);
  registerSrs(ratings, runtime);
  registerElo(ratings, runtime);
  registerFpi(ratings, runtime);
}

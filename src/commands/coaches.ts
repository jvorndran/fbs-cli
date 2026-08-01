import { InvalidArgumentError, type Command } from "commander";

import {
  buildCoachProfileQuery,
  buildCoachSeasonsQuery,
  buildCoachesQuery,
  buildCoachTenuresQuery,
  type CoachProfileQuery,
  type CoachSeasonsQuery,
  type CoachesQuery,
  type CoachTenuresQuery,
  validateCoachProfileQuery,
  validateCoachSeasonsQuery,
  validateCoachesQuery,
  validateCoachTenuresQuery,
} from "../cfbd/query-builders-analytics";
import type { CommandRuntime } from "../runtime";
import { runEndpoint } from "../runtime";
import {
  transformCoachProfile,
  transformCoachSeasons,
  transformCoaches,
  transformCoachTenures,
} from "../transformers/analytics-coaches";
import { asAnalyticsApi } from "./analytics-shared";
import { parseInteger, suppliedOptions } from "./options";
import { asQueryRecord, withCommandContext } from "./shared";

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidArgumentError("Expected true or false.");
}

function registerProfile(coaches: Command, runtime: CommandRuntime): void {
  const profile = coaches
    .command("profile")
    .description("Retrieve a canonical coach profile and career totals")
    .option("--coach-id <number>", "Coach ID", parseInteger);
  profile
    .addHelpText(
      "after",
      "\n--coach-id is required.\n\nExample:\n  fbs coaches profile --coach-id 123\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CoachProfileQuery>>(command);
      const rawQuery = buildCoachProfileQuery(options);
      await withCommandContext("coaches profile", rawQuery, async () => {
        const query = validateCoachProfileQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "coaches profile",
          endpoint: "/coaches/profile",
          query: asQueryRecord(query),
          resultKey: "coach_profile",
          request: (api) => asAnalyticsApi(api).coachProfile(query),
          transform: transformCoachProfile,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerSeasons(coaches: Command, runtime: CommandRuntime): void {
  const seasons = coaches
    .command("seasons")
    .description("Retrieve detailed coach-season records")
    .option("--coach-id <number>", "Coach ID", parseInteger)
    .option("--max-year <number>", "End of season range", parseInteger)
    .option("--min-year <number>", "Start of season range", parseInteger)
    .option("--team <name>", "Team name")
    .option("--year <number>", "Exact season year", parseInteger);
  seasons
    .addHelpText(
      "after",
      "\nAll filters are optional. --min-year must not exceed --max-year.\n\nExamples:\n  fbs coaches seasons --coach-id 123\n  fbs coaches seasons --team \"Florida State\" --year 2025\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CoachSeasonsQuery>>(command);
      const rawQuery = buildCoachSeasonsQuery(options);
      await withCommandContext("coaches seasons", rawQuery, async () => {
        const query = validateCoachSeasonsQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "coaches seasons",
          endpoint: "/coaches/seasons",
          query: asQueryRecord(query),
          resultKey: "coach_seasons",
          request: (api) => asAnalyticsApi(api).coachSeasons(query),
          transform: transformCoachSeasons,
        });
      });
    })
    .allowExcessArguments(false);
}

function registerTenures(coaches: Command, runtime: CommandRuntime): void {
  const tenures = coaches
    .command("tenures")
    .description("Retrieve continuous head-coaching tenures")
    .option("--active <boolean>", "Filter by active tenure", parseBoolean)
    .option("--coach-id <number>", "Coach ID", parseInteger)
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season contained by the tenure", parseInteger);
  tenures
    .addHelpText(
      "after",
      "\nAll filters are optional. --active accepts true or false.\n\nExamples:\n  fbs coaches tenures --active true\n  fbs coaches tenures --team \"Florida State\" --year 2025\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CoachTenuresQuery>>(command);
      const rawQuery = buildCoachTenuresQuery(options);
      await withCommandContext("coaches tenures", rawQuery, async () => {
        const query = validateCoachTenuresQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "coaches tenures",
          endpoint: "/coaches/tenures",
          query: asQueryRecord(query),
          resultKey: "coach_tenures",
          request: (api) => asAnalyticsApi(api).coachTenures(query),
          transform: transformCoachTenures,
        });
      });
    })
    .allowExcessArguments(false);
}

export function registerCoachesCommand(program: Command, runtime: CommandRuntime): void {
  const coaches = program
    .command("coaches")
    .description("Retrieve historical head coach information")
    .option("--first-name <value>", "Coach first name")
    .option("--last-name <value>", "Coach last name")
    .option("--max-year <number>", "End of season range", parseInteger)
    .option("--min-year <number>", "Start of season range", parseInteger)
    .option("--team <name>", "Team name")
    .option("--year <number>", "Season year", parseInteger);
  coaches
    .addHelpText(
      "after",
      "\nAll filters are optional. --min-year must not exceed --max-year.\n\nExamples:\n  fbs coaches --team \"Florida State\"\n  fbs coaches --last-name Bowden --min-year 1976 --max-year 2009\n",
    )
    .action(async (_options: unknown, command: Command) => {
      const options = suppliedOptions<Partial<CoachesQuery>>(command);
      const rawQuery = buildCoachesQuery(options);
      await withCommandContext("coaches", rawQuery, async () => {
        const query = validateCoachesQuery(rawQuery);
        await runEndpoint(runtime, {
          command: "coaches",
          endpoint: "/coaches",
          query: asQueryRecord(query),
          resultKey: "coaches",
          request: (api) => asAnalyticsApi(api).coaches(query),
          transform: transformCoaches,
        });
      });
    })
    .allowExcessArguments(false);
  registerProfile(coaches, runtime);
  registerSeasons(coaches, runtime);
  registerTenures(coaches, runtime);
}

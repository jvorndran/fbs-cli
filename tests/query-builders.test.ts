import { describe, expect, test } from "bun:test";

import {
  buildAdvancedGameStatsQuery,
  buildAdvancedSeasonStatsQuery,
  buildDrivesQuery,
  buildFbsTeamsQuery,
  buildGamePlayerStatsQuery,
  buildGamesQuery,
  buildGameTeamStatsQuery,
  buildPlayStatsQuery,
  buildPlayerUsageQuery,
  buildPlaysQuery,
  buildRosterQuery,
  buildUsageQuery,
  buildWeatherQuery,
  validateAdvancedGameStatsQuery,
  validateAdvancedSeasonStatsQuery,
  validateDrivesQuery,
  validateFbsTeamsQuery,
  validateGamePlayerStatsQuery,
  validateGamesQuery,
  validateGameTeamStatsQuery,
  validatePlayStatsQuery,
  validatePlayerUsageQuery,
  validatePlaysQuery,
  validateRosterQuery,
  validateUsageQuery,
  validateWeatherQuery,
} from "../src/cfbd/query-builders.ts";
import { QueryValidationError } from "../src/errors.ts";

function expectInvalid(
  operation: () => unknown,
  message: string,
  hint?: string,
): void {
  try {
    operation();
    throw new Error("Expected query validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryValidationError);
    expect(error).toMatchObject({
      code: "invalid_query",
      message,
      exitCode: 2,
      ...(hint === undefined ? {} : { hint }),
    });
  }
}

describe("pure query builders", () => {
  test("teams fbs maps year", () => {
    expect(buildFbsTeamsQuery({ year: 2026 })).toEqual({ year: 2026 });
  });

  test("games maps every supported option to the exact CFBD key", () => {
    expect(
      buildGamesQuery({
        id: 401752731,
        year: 2026,
        week: 1,
        seasonType: "postseason",
        team: "Florida State",
        home: "Florida State",
        away: "Alabama",
        conference: "ACC",
        classification: "fbs",
        competition: "cfp",
        round: "quarterfinal",
      }),
    ).toEqual({
      id: 401752731,
      year: 2026,
      week: 1,
      seasonType: "postseason",
      team: "Florida State",
      home: "Florida State",
      away: "Alabama",
      conference: "ACC",
      classification: "fbs",
      competition: "cfp",
      round: "quarterfinal",
    });
  });

  test("roster maps year, team, and classification", () => {
    expect(
      buildRosterQuery({
        year: 2026,
        team: "Florida State",
        classification: "fbs",
      }),
    ).toEqual({
      year: 2026,
      team: "Florida State",
      classification: "fbs",
    });
  });

  test("info usage maps API window controls", () => {
    expect(buildUsageQuery({ api: "cfb", days: 7, limit: 10 })).toEqual({
      api: "cfb",
      days: 7,
      limit: 10,
    });
  });

  test("games teams maps all box-score filters", () => {
    expect(
      buildGameTeamStatsQuery({
        id: 401752731,
        year: 2026,
        week: 1,
        team: "Florida State",
        conference: "ACC",
        seasonType: "regular",
        classification: "fbs",
      }),
    ).toEqual({
      id: 401752731,
      year: 2026,
      week: 1,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
      classification: "fbs",
    });
  });

  test("games players additionally maps category", () => {
    expect(
      buildGamePlayerStatsQuery({
        id: 401752731,
        year: 2026,
        week: 1,
        team: "Florida State",
        conference: "ACC",
        category: "passing",
        seasonType: "regular",
        classification: "fbs",
      }),
    ).toEqual({
      id: 401752731,
      year: 2026,
      week: 1,
      team: "Florida State",
      conference: "ACC",
      category: "passing",
      seasonType: "regular",
      classification: "fbs",
    });
  });

  test("drives maps offense/defense conference filters exactly", () => {
    expect(
      buildDrivesQuery({
        year: 2026,
        week: 1,
        seasonType: "regular",
        team: "Florida State",
        offense: "Florida State",
        defense: "Alabama",
        conference: "ACC",
        offenseConference: "ACC",
        defenseConference: "SEC",
        classification: "fbs",
      }),
    ).toEqual({
      year: 2026,
      week: 1,
      seasonType: "regular",
      team: "Florida State",
      offense: "Florida State",
      defense: "Alabama",
      conference: "ACC",
      offenseConference: "ACC",
      defenseConference: "SEC",
      classification: "fbs",
    });
  });

  test("plays maps every drive filter plus playType", () => {
    expect(
      buildPlaysQuery({
        year: 2026,
        week: 1,
        seasonType: "regular",
        team: "Florida State",
        offense: "Florida State",
        defense: "Alabama",
        conference: "ACC",
        offenseConference: "ACC",
        defenseConference: "SEC",
        playType: "Rush",
        classification: "fbs",
      }),
    ).toEqual({
      year: 2026,
      week: 1,
      seasonType: "regular",
      team: "Florida State",
      offense: "Florida State",
      defense: "Alabama",
      conference: "ACC",
      offenseConference: "ACC",
      defenseConference: "SEC",
      playType: "Rush",
      classification: "fbs",
    });
  });

  test("plays stats maps all identifier and season filters", () => {
    expect(
      buildPlayStatsQuery({
        gameId: 401752731,
        athleteId: 4433971,
        statTypeId: 1,
        year: 2026,
        week: 1,
        team: "Florida State",
        conference: "ACC",
        seasonType: "regular",
      }),
    ).toEqual({
      gameId: 401752731,
      athleteId: 4433971,
      statTypeId: 1,
      year: 2026,
      week: 1,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
    });
  });

  test("advanced game stats maps the boolean flag even when false", () => {
    expect(
      buildAdvancedGameStatsQuery({
        year: 2026,
        team: "Florida State",
        week: 1,
        opponent: "Alabama",
        seasonType: "regular",
        excludeGarbageTime: false,
      }),
    ).toEqual({
      year: 2026,
      team: "Florida State",
      week: 1,
      opponent: "Alabama",
      seasonType: "regular",
      excludeGarbageTime: false,
    });
  });

  test("player usage maps playerId and the boolean flag", () => {
    expect(
      buildPlayerUsageQuery({
        year: 2026,
        team: "Florida State",
        conference: "ACC",
        playerId: 4433971,
        position: "QB",
        excludeGarbageTime: true,
      }),
    ).toEqual({
      year: 2026,
      team: "Florida State",
      conference: "ACC",
      playerId: 4433971,
      position: "QB",
      excludeGarbageTime: true,
    });
  });

  test("advanced season stats maps week range and garbage-time filter", () => {
    expect(
      buildAdvancedSeasonStatsQuery({
        year: 2026,
        team: "Florida State",
        startWeek: 1,
        endWeek: 6,
        classification: "fbs",
        excludeGarbageTime: true,
      }),
    ).toEqual({
      year: 2026,
      team: "Florida State",
      startWeek: 1,
      endWeek: 6,
      classification: "fbs",
      excludeGarbageTime: true,
    });
  });

  test("weather maps gameId and season filters", () => {
    expect(
      buildWeatherQuery({
        gameId: 401752731,
        year: 2026,
        week: 1,
        team: "Florida State",
        conference: "ACC",
        seasonType: "regular",
        classification: "fbs",
      }),
    ).toEqual({
      gameId: 401752731,
      year: 2026,
      week: 1,
      team: "Florida State",
      conference: "ACC",
      seasonType: "regular",
      classification: "fbs",
    });
  });

  test("omits undefined fields without mutating the options object", () => {
    const rawOptions = Object.freeze({
      year: 2026,
      week: undefined,
      team: "Florida State",
    });
    const options = rawOptions as unknown as Parameters<typeof buildGamesQuery>[0];

    expect(buildGamesQuery(options)).toEqual({
      year: 2026,
      team: "Florida State",
    });
    expect(rawOptions).toEqual({
      year: 2026,
      week: undefined,
      team: "Florida State",
    });
  });

  test("all optional-only builders return an empty query for empty options", () => {
    expect(buildFbsTeamsQuery({})).toEqual({});
    expect(buildRosterQuery({})).toEqual({});
    expect(buildUsageQuery({})).toEqual({});
    expect(buildPlayStatsQuery({})).toEqual({});
  });
});

describe("query validation", () => {
  test("accepts documented no-filter queries", () => {
    expect(validateFbsTeamsQuery({})).toEqual({});
    expect(validateRosterQuery({})).toEqual({});
    expect(validateUsageQuery({})).toEqual({});
    expect(validatePlayStatsQuery({})).toEqual({});
  });

  test("games requires year unless id is supplied", () => {
    expect(validateGamesQuery({ id: 401752731 })).toEqual({ id: 401752731 });
    expect(validateGamesQuery({ year: 2026 })).toEqual({ year: 2026 });
    expectInvalid(
      () => validateGamesQuery({ team: "Florida State" }),
      "year is required when id is not specified",
      "Supply --year or query a game with --id.",
    );
  });

  test("games requires competition when playoff round is supplied", () => {
    expect(
      validateGamesQuery({
        year: 2026,
        competition: "cfp",
        round: "quarterfinal",
      }),
    ).toMatchObject({ competition: "cfp", round: "quarterfinal" });
    expectInvalid(
      () => validateGamesQuery({ year: 2026, round: "quarterfinal" }),
      "competition is required when round is specified",
      "Supply --competition cfp with --round.",
    );
  });

  test.each([
    ["id", () => validateGameTeamStatsQuery({ id: 401752731 })],
    ["week", () => validateGameTeamStatsQuery({ year: 2026, week: 1 })],
    ["team", () => validateGameTeamStatsQuery({ year: 2026, team: "Florida State" })],
    ["conference", () => validateGameTeamStatsQuery({ year: 2026, conference: "ACC" })],
  ])("games teams accepts the %s filter route", (_label, operation) => {
    expect(operation()).toEqual(expect.any(Object));
  });

  test("games teams rejects incomplete conditional filters", () => {
    expectInvalid(
      () => validateGameTeamStatsQuery({ team: "Florida State" }),
      "year is required when id is not specified",
      "Supply --id, or supply --year with --week, --team, or --conference.",
    );
    expectInvalid(
      () => validateGameTeamStatsQuery({ year: 2026 }),
      "one of week, team, or conference is required when id is not specified",
      "Supply --week, --team, or --conference with --year.",
    );
  });

  test.each([
    ["id", () => validateGamePlayerStatsQuery({ id: 401752731 })],
    ["week", () => validateGamePlayerStatsQuery({ year: 2026, week: 1 })],
    ["team", () => validateGamePlayerStatsQuery({ year: 2026, team: "Florida State" })],
    ["conference", () => validateGamePlayerStatsQuery({ year: 2026, conference: "ACC" })],
  ])("games players accepts the %s filter route", (_label, operation) => {
    expect(operation()).toEqual(expect.any(Object));
  });

  test("games players rejects incomplete conditional filters", () => {
    expectInvalid(
      () => validateGamePlayerStatsQuery({ category: "passing" }),
      "year is required when id is not specified",
      "Supply --id, or supply --year with --week, --team, or --conference.",
    );
    expectInvalid(
      () => validateGamePlayerStatsQuery({ year: 2026, category: "passing" }),
      "one of week, team, or conference is required when id is not specified",
      "Supply --week, --team, or --conference with --year.",
    );
  });

  test("drives requires year", () => {
    expect(validateDrivesQuery({ year: 2026 })).toEqual({ year: 2026 });
    expectInvalid(
      () => validateDrivesQuery({ team: "Florida State" }),
      "year is required",
      "Supply --year.",
    );
  });

  test("plays requires both year and week", () => {
    expect(validatePlaysQuery({ year: 2026, week: 1 })).toEqual({
      year: 2026,
      week: 1,
    });
    for (const query of [{}, { year: 2026 }, { week: 1 }]) {
      expectInvalid(
        () => validatePlaysQuery(query),
        "year and week are required",
        "Supply both --year and --week.",
      );
    }
  });

  test("advanced game stats requires at least year or team", () => {
    expect(validateAdvancedGameStatsQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(
      validateAdvancedGameStatsQuery({
        team: "Florida State",
        excludeGarbageTime: false,
      }),
    ).toEqual({ team: "Florida State", excludeGarbageTime: false });
    expectInvalid(
      () => validateAdvancedGameStatsQuery({ week: 1 }),
      "at least one of year or team is required",
      "Supply --year or --team.",
    );
  });

  test("player usage requires year", () => {
    expect(validatePlayerUsageQuery({ year: 2026 })).toEqual({ year: 2026 });
    expectInvalid(
      () => validatePlayerUsageQuery({ team: "Florida State" }),
      "year is required",
      "Supply --year.",
    );
  });

  test("advanced season stats requires at least year or team", () => {
    expect(validateAdvancedSeasonStatsQuery({ year: 2026 })).toEqual({ year: 2026 });
    expect(validateAdvancedSeasonStatsQuery({ team: "Florida State" })).toEqual({
      team: "Florida State",
    });
    expectInvalid(
      () => validateAdvancedSeasonStatsQuery({ startWeek: 1 }),
      "at least one of year or team is required",
      "Supply --year or --team.",
    );
  });

  test("advanced season stats validates week range order", () => {
    expect(
      validateAdvancedSeasonStatsQuery({
        year: 2026,
        startWeek: 1,
        endWeek: 6,
      }),
    ).toMatchObject({ startWeek: 1, endWeek: 6 });
    expectInvalid(
      () =>
        validateAdvancedSeasonStatsQuery({
          year: 2026,
          startWeek: 6,
          endWeek: 1,
        }),
      "startWeek must be less than or equal to endWeek",
      "Use an --end-week value greater than or equal to --start-week.",
    );
  });

  test("weather requires year unless gameId is supplied", () => {
    expect(validateWeatherQuery({ gameId: 401752731 })).toEqual({
      gameId: 401752731,
    });
    expect(validateWeatherQuery({ year: 2026 })).toEqual({ year: 2026 });
    expectInvalid(
      () => validateWeatherQuery({ team: "Florida State" }),
      "year is required when gameId is not specified",
      "Supply --year or query one game with --game-id.",
    );
  });

  test("accepts week zero wherever the provider exposes a week filter", () => {
    expect(validateGamesQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(validateGameTeamStatsQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(validateGamePlayerStatsQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(validateDrivesQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(validatePlaysQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(validatePlayStatsQuery({ week: 0 }).week).toBe(0);
    expect(validateAdvancedGameStatsQuery({ year: 2026, week: 0 }).week).toBe(0);
    expect(
      validateAdvancedSeasonStatsQuery({ year: 2026, startWeek: 0, endWeek: 0 }),
    ).toMatchObject({ startWeek: 0, endWeek: 0 });
    expect(validateWeatherQuery({ year: 2026, week: 0 }).week).toBe(0);
  });

  test.each([
    ["season type", () => validateGamesQuery({ year: 2026, seasonType: "preseason" as never })],
    ["classification", () => validateRosterQuery({ classification: "naia" as never })],
    ["usage API", () => validateUsageQuery({ api: "football" as never })],
    ["competition", () => validateGamesQuery({ year: 2026, competition: "bcs" as never })],
    ["round", () => validateGamesQuery({ year: 2026, competition: "cfp", round: "final" as never })],
  ])("rejects an invalid %s enum", (_label, operation) => {
    expect(operation).toThrow(QueryValidationError);
  });

  test("validates usage bounds and numeric integrity", () => {
    expect(validateUsageQuery({ api: "all", days: 31, limit: 50 })).toEqual({
      api: "all",
      days: 31,
      limit: 50,
    });
    expect(() => validateUsageQuery({ days: 32 })).toThrow(QueryValidationError);
    expect(() => validateUsageQuery({ limit: 51 })).toThrow(QueryValidationError);
    expect(() => validateFbsTeamsQuery({ year: 2026.5 })).toThrow(
      QueryValidationError,
    );
    expect(() => validatePlayStatsQuery({ gameId: 0 })).toThrow(
      QueryValidationError,
    );
  });
});

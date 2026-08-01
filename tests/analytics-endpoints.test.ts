import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import { parse as parseYaml } from "yaml";

import type { CfbdApi } from "../src/cfbd/api";
import type { AnalyticsCfbdApi } from "../src/cfbd/api-analytics";
import {
  buildCoachProfileQuery,
  buildCoachSeasonsQuery,
  buildCoachesQuery,
  buildCoachTenuresQuery,
  buildConferenceSpRatingsQuery,
  buildDraftPicksQuery,
  buildEloRatingsQuery,
  buildExpandedSrsRatingsQuery,
  buildFpiRatingsQuery,
  buildRankingsQuery,
  buildRecruitingGroupsQuery,
  buildRecruitingPlayersQuery,
  buildRecruitingTeamsQuery,
  buildSpRatingsQuery,
  buildSrsRatingsQuery,
  buildWepaKickingQuery,
  buildWepaPassingQuery,
  buildWepaRushingQuery,
  buildWepaTeamSeasonQuery,
  validateCoachProfileQuery,
  validateCoachSeasonsQuery,
  validateCoachesQuery,
  validateCoachTenuresQuery,
  validateConferenceSpRatingsQuery,
  validateDraftPicksQuery,
  validateEloRatingsQuery,
  validateExpandedSrsRatingsQuery,
  validateFpiRatingsQuery,
  validateRankingsQuery,
  validateRecruitingGroupsQuery,
  validateRecruitingPlayersQuery,
  validateRecruitingTeamsQuery,
  validateSpRatingsQuery,
  validateSrsRatingsQuery,
  validateWepaKickingQuery,
  validateWepaPassingQuery,
  validateWepaRushingQuery,
  validateWepaTeamSeasonQuery,
} from "../src/cfbd/query-builders-analytics";
import { QueryValidationError } from "../src/errors";
import { registerCoachesCommand } from "../src/commands/coaches";
import { registerDraftCommand } from "../src/commands/draft";
import { registerRankingsCommand } from "../src/commands/rankings";
import { registerRatingsCommand } from "../src/commands/ratings";
import { registerRecruitingCommand } from "../src/commands/recruiting";
import { registerWepaCommand } from "../src/commands/wepa";
import type { CommandRuntime } from "../src/runtime";
import { snakeCaseDeep } from "../src/utils/snake-case";
import {
  transformCoachProfile,
  transformCoachSeasons,
  transformCoaches,
  transformCoachTenures,
} from "../src/transformers/analytics-coaches";
import {
  transformDraftPicks,
  transformDraftPositions,
  transformDraftTeams,
} from "../src/transformers/analytics-draft";
import { transformRankings } from "../src/transformers/analytics-rankings";
import {
  transformConferenceSpRatings,
  transformEloRatings,
  transformExpandedSrsRatings,
  transformFpiRatings,
  transformSpRatings,
  transformSrsRatings,
} from "../src/transformers/analytics-ratings";
import {
  transformRecruitingGroups,
  transformRecruitingPlayers,
  transformRecruitingTeams,
} from "../src/transformers/analytics-recruiting";
import {
  transformWepaKicking,
  transformWepaPassing,
  transformWepaRushing,
  transformWepaTeamSeason,
} from "../src/transformers/analytics-wepa";

function expectInvalid(operation: () => unknown, message: string, hint?: string): void {
  try {
    operation();
    throw new Error("Expected query validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(QueryValidationError);
    expect(error).toMatchObject({
      code: "invalid_query",
      message,
      ...(hint === undefined ? {} : { hint }),
    });
  }
}

describe("analytics and history query builders", () => {
  test("maps every WEPA filter to its generated-client key", () => {
    expect(
      buildWepaTeamSeasonQuery({ conference: "ACC", team: "Florida State", year: 2025 }),
    ).toEqual({ conference: "ACC", team: "Florida State", year: 2025 });
    expect(
      buildWepaPassingQuery({
        conference: "ACC",
        position: "QB",
        team: "Florida State",
        year: 2025,
      }),
    ).toEqual({
      conference: "ACC",
      position: "QB",
      team: "Florida State",
      year: 2025,
    });
    expect(
      buildWepaRushingQuery({
        conference: "ACC",
        position: "RB",
        team: "Florida State",
        year: 2025,
      }),
    ).toEqual({
      conference: "ACC",
      position: "RB",
      team: "Florida State",
      year: 2025,
    });
    expect(
      buildWepaKickingQuery({ conference: "ACC", team: "Florida State", year: 2025 }),
    ).toEqual({ conference: "ACC", team: "Florida State", year: 2025 });
  });

  test("maps recruiting fields, including kebab-case CLI targets", () => {
    expect(
      buildRecruitingPlayersQuery({
        classification: "HighSchool",
        position: "QB",
        state: "FL",
        team: "Florida State",
        year: 2026,
      }),
    ).toEqual({
      classification: "HighSchool",
      position: "QB",
      state: "FL",
      team: "Florida State",
      year: 2026,
    });
    expect(buildRecruitingTeamsQuery({ team: "Florida State", year: 2026 })).toEqual({
      team: "Florida State",
      year: 2026,
    });
    expect(
      buildRecruitingGroupsQuery({
        conference: "ACC",
        endYear: 2025,
        recruitType: "HighSchool",
        startYear: 2020,
        team: "Florida State",
      }),
    ).toEqual({
      conference: "ACC",
      endYear: 2025,
      recruitType: "HighSchool",
      startYear: 2020,
      team: "Florida State",
    });
  });

  test("maps all rating and ranking filters", () => {
    expect(buildSpRatingsQuery({ team: "Florida State", year: 2025 })).toEqual({
      team: "Florida State",
      year: 2025,
    });
    expect(
      buildConferenceSpRatingsQuery({
        classification: "fbs",
        conference: "ACC",
        year: 2025,
      }),
    ).toEqual({ classification: "fbs", conference: "ACC", year: 2025 });
    expect(
      buildSrsRatingsQuery({ conference: "ACC", team: "Florida State", year: 2025 }),
    ).toEqual({ conference: "ACC", team: "Florida State", year: 2025 });
    expect(
      buildExpandedSrsRatingsQuery({
        classification: "fcs",
        conference: "CAA",
        team: "Richmond",
        year: 2025,
      }),
    ).toEqual({
      classification: "fcs",
      conference: "CAA",
      team: "Richmond",
      year: 2025,
    });
    expect(
      buildEloRatingsQuery({
        conference: "ACC",
        seasonType: "regular",
        team: "Florida State",
        week: 0,
        year: 2025,
      }),
    ).toEqual({
      conference: "ACC",
      seasonType: "regular",
      team: "Florida State",
      week: 0,
      year: 2025,
    });
    expect(buildFpiRatingsQuery({ conference: "ACC", year: 2025 })).toEqual({
      conference: "ACC",
      year: 2025,
    });
    expect(
      buildRankingsQuery({
        final: false,
        latest: true,
        poll: "cfp",
        seasonType: "postseason",
        week: 15,
        year: 2025,
      }),
    ).toEqual({
      final: false,
      latest: true,
      poll: "cfp",
      seasonType: "postseason",
      week: 15,
      year: 2025,
    });
  });

  test("maps draft and coach history filters exactly", () => {
    expect(
      buildDraftPicksQuery({
        conference: "ACC",
        position: "QB",
        school: "Florida State",
        team: "TB",
        year: 2025,
      }),
    ).toEqual({
      conference: "ACC",
      position: "QB",
      school: "Florida State",
      team: "TB",
      year: 2025,
    });
    expect(
      buildCoachesQuery({
        firstName: "Bobby",
        lastName: "Bowden",
        maxYear: 2009,
        minYear: 1976,
        team: "Florida State",
        year: 1999,
      }),
    ).toEqual({
      firstName: "Bobby",
      lastName: "Bowden",
      maxYear: 2009,
      minYear: 1976,
      team: "Florida State",
      year: 1999,
    });
    expect(buildCoachProfileQuery({ coachId: 123 })).toEqual({ coachId: 123 });
    expect(
      buildCoachSeasonsQuery({
        coachId: 123,
        maxYear: 2009,
        minYear: 1976,
        team: "Florida State",
        year: 1999,
      }),
    ).toEqual({
      coachId: 123,
      maxYear: 2009,
      minYear: 1976,
      team: "Florida State",
      year: 1999,
    });
    expect(
      buildCoachTenuresQuery({ active: false, coachId: 123, team: "Florida State", year: 1999 }),
    ).toEqual({ active: false, coachId: 123, team: "Florida State", year: 1999 });
  });

  test("omits only undefined query fields", () => {
    expect(
      buildEloRatingsQuery({ year: 2025, week: undefined } as never),
    ).toEqual({ year: 2025 });
    expect(
      buildCoachTenuresQuery({ active: false, coachId: undefined } as never),
    ).toEqual({
      active: false,
    });
  });
});

describe("analytics and history query validation", () => {
  test("accepts documented optional-only queries", () => {
    expect(validateWepaTeamSeasonQuery({})).toEqual({});
    expect(validateWepaPassingQuery({})).toEqual({});
    expect(validateWepaRushingQuery({})).toEqual({});
    expect(validateWepaKickingQuery({})).toEqual({});
    expect(validateRecruitingTeamsQuery({})).toEqual({});
    expect(validateRecruitingGroupsQuery({})).toEqual({});
    expect(validateConferenceSpRatingsQuery({})).toEqual({});
    expect(validateEloRatingsQuery({})).toEqual({});
    expect(validateDraftPicksQuery({})).toEqual({});
    expect(validateCoachesQuery({})).toEqual({});
    expect(validateCoachSeasonsQuery({})).toEqual({});
    expect(validateCoachTenuresQuery({})).toEqual({});
  });

  test("requires year or team for provider-conditional endpoints", () => {
    const validators = [
      validateRecruitingPlayersQuery,
      validateSpRatingsQuery,
      validateSrsRatingsQuery,
      validateExpandedSrsRatingsQuery,
      validateFpiRatingsQuery,
    ] as const;
    for (const validate of validators) {
      expect(validate({ year: 2025 } as never)).toEqual({ year: 2025 });
      expect(validate({ team: "Florida State" } as never)).toEqual({
        team: "Florida State",
      });
      expectInvalid(
        () => validate({} as never),
        "at least one of year or team is required",
        "Supply --year or --team.",
      );
    }
  });

  test("rankings and coach profile require their identifiers", () => {
    expect(validateRankingsQuery({ year: 2025 })).toEqual({ year: 2025 });
    expectInvalid(() => validateRankingsQuery({}), "year is required", "Supply --year.");
    expect(validateCoachProfileQuery({ coachId: 123 })).toEqual({ coachId: 123 });
    expectInvalid(
      () => validateCoachProfileQuery({}),
      "coachId is required",
      "Supply --coach-id.",
    );
  });

  test("validates recruiting and coaching year ranges", () => {
    expectInvalid(
      () => validateRecruitingGroupsQuery({ startYear: 2025, endYear: 2020 }),
      "startYear must be less than or equal to endYear",
      "Use an --end-year value greater than or equal to --start-year.",
    );
    for (const validate of [validateCoachesQuery, validateCoachSeasonsQuery]) {
      expectInvalid(
        () => validate({ minYear: 2025, maxYear: 2020 }),
        "minYear must be less than or equal to maxYear",
        "Use a --max-year value greater than or equal to --min-year.",
      );
    }
  });

  test("validates enum domains, positive IDs, and nonnegative weeks", () => {
    expect(() =>
      validateRecruitingPlayersQuery({
        year: 2025,
        classification: "high_school" as never,
      }),
    ).toThrow(QueryValidationError);
    expect(() => validateConferenceSpRatingsQuery({ classification: "naia" as never })).toThrow(
      QueryValidationError,
    );
    expect(() => validateRankingsQuery({ year: 2025, poll: "ap" as never })).toThrow(
      QueryValidationError,
    );
    expect(() => validateEloRatingsQuery({ week: -1 })).toThrow(QueryValidationError);
    expect(() => validateCoachProfileQuery({ coachId: 0 })).toThrow(QueryValidationError);
  });
});

describe("analytics and history endpoint transformers", () => {
  test("WEPA transformers snake-case nested metrics and preserve precision", () => {
    const [team] = transformWepaTeamSeason([
      {
        year: 2025,
        teamId: 52,
        team: "Florida State",
        epaAllowed: { total: 0.1234567890123 },
        optional: null,
      },
    ] as never);
    expect(team).toMatchObject({
      year: 2025,
      team_id: 52,
      epa_allowed: { total: 0.1234567890123 },
    });
    expect(team).not.toHaveProperty("optional");

    for (const output of [
      transformWepaPassing([{ playerId: 1, weightedEpa: 0 }] as never),
      transformWepaRushing([{ playerId: 2, weightedEpa: 1.25 }] as never),
      transformWepaKicking([{ playerId: 3, paar: -0.5 }] as never),
    ]) {
      expect(output[0]).toHaveProperty("player_id");
    }
  });

  test("recruiting and rating transformers retain nested provider dimensions", () => {
    expect(
      transformRecruitingPlayers([{ athleteId: 1, committedTo: "Florida State" }] as never)[0],
    ).toMatchObject({ athlete_id: 1, committed_to: "Florida State" });
    expect(transformRecruitingTeams([{ year: 2026, points: 0 }] as never)[0]).toMatchObject({
      year: 2026,
      points: 0,
    });
    expect(
      transformRecruitingGroups([{ positionGroup: "Quarterback", averageRating: 0.9 }] as never)[0],
    ).toMatchObject({ position_group: "Quarterback", average_rating: 0.9 });

    const ratingTransforms = [
      transformSpRatings,
      transformConferenceSpRatings,
      transformSrsRatings,
      transformExpandedSrsRatings,
      transformEloRatings,
      transformFpiRatings,
    ] as const;
    for (const transform of ratingTransforms) {
      expect(transform([{ teamId: 52, overallRating: 10.5 }] as never)[0]).toMatchObject({
        team_id: 52,
        overall_rating: 10.5,
      });
    }
  });

  test("rankings, draft, and coach transformers snake-case without inventing analysis", () => {
    expect(
      transformRankings([{ seasonType: "regular", polls: [{ poll: "AP Top 25" }] }] as never)[0],
    ).toMatchObject({ season_type: "regular", polls: [{ poll: "AP Top 25" }] });

    expect(transformDraftTeams([{ locationName: "Tampa Bay" }] as never)[0]).toEqual({
      location_name: "Tampa Bay",
    });
    expect(transformDraftPositions([{ abbreviation: "QB", positionName: "Quarterback" }] as never)[0]).toEqual({
      abbreviation: "QB",
      position_name: "Quarterback",
    });
    expect(transformDraftPicks([{ collegeAthleteId: 7, overall: 1 }] as never)[0]).toEqual({
      college_athlete_id: 7,
      overall: 1,
    });

    expect(transformCoaches([{ firstName: "Bobby", lastName: "Bowden" }] as never)[0]).toEqual({
      first_name: "Bobby",
      last_name: "Bowden",
    });
    expect(transformCoachProfile({ coachId: 123, careerTotals: { wins: 0 } } as never)).toEqual({
      coach_id: 123,
      career_totals: { wins: 0 },
    });
    expect(transformCoachSeasons([{ coachId: 123, seasonYear: 1999 }] as never)[0]).toEqual({
      coach_id: 123,
      season_year: 1999,
    });
    expect(transformCoachTenures([{ coachId: 123, active: false }] as never)[0]).toEqual({
      coach_id: 123,
      active: false,
    });
  });
});

interface RouteCase {
  argv: string[];
  adapter: keyof AnalyticsCfbdApi;
  command: string;
  endpoint: string;
  query: Record<string, unknown>;
  resultKey: string;
}

async function runRegisteredRoute(route: RouteCase): Promise<{
  call: { method: PropertyKey; query: unknown };
  document: Record<string, unknown>;
}> {
  const calls: Array<{ method: PropertyKey; query: unknown }> = [];
  const extension = new Proxy(
    {},
    {
      get: (_target, method) => async (query?: unknown) => {
        calls.push({ method, query });
        return method === "coachProfile" ? {} : [];
      },
    },
  ) as AnalyticsCfbdApi;
  let stdout = "";
  const runtime: CommandRuntime = {
    getApi: () => extension as unknown as CfbdApi,
    io: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: () => undefined,
    },
  };
  const program = new Command()
    .name("fbs")
    .exitOverride()
    .enablePositionalOptions()
    .configureOutput({
      writeOut: runtime.io.stdout,
      writeErr: runtime.io.stderr,
      outputError: () => undefined,
    });
  registerWepaCommand(program, runtime);
  registerRecruitingCommand(program, runtime);
  registerRatingsCommand(program, runtime);
  registerRankingsCommand(program, runtime);
  registerDraftCommand(program, runtime);
  registerCoachesCommand(program, runtime);

  await program.parseAsync(route.argv, { from: "user" });
  const call = calls[0];
  if (call === undefined) throw new Error("Expected the adapter to be called");
  return { call, document: parseYaml(stdout) as Record<string, unknown> };
}

describe("analytics and history command registrations", () => {
  const routes: RouteCase[] = [
    { argv: ["wepa", "team", "season"], adapter: "wepaTeamSeason", command: "wepa team season", endpoint: "/wepa/team/season", query: {}, resultKey: "team_metrics" },
    { argv: ["wepa", "players", "passing"], adapter: "wepaPassing", command: "wepa players passing", endpoint: "/wepa/players/passing", query: {}, resultKey: "player_metrics" },
    { argv: ["wepa", "players", "rushing"], adapter: "wepaRushing", command: "wepa players rushing", endpoint: "/wepa/players/rushing", query: {}, resultKey: "player_metrics" },
    { argv: ["wepa", "players", "kicking"], adapter: "wepaKicking", command: "wepa players kicking", endpoint: "/wepa/players/kicking", query: {}, resultKey: "kicker_ratings" },
    { argv: ["recruiting", "players", "--year", "2025"], adapter: "recruitingPlayers", command: "recruiting players", endpoint: "/recruiting/players", query: { year: 2025 }, resultKey: "recruits" },
    { argv: ["recruiting", "teams"], adapter: "recruitingTeams", command: "recruiting teams", endpoint: "/recruiting/teams", query: {}, resultKey: "team_rankings" },
    { argv: ["recruiting", "groups"], adapter: "recruitingGroups", command: "recruiting groups", endpoint: "/recruiting/groups", query: {}, resultKey: "recruiting_groups" },
    { argv: ["ratings", "sp", "--year", "2025"], adapter: "spRatings", command: "ratings sp", endpoint: "/ratings/sp", query: { year: 2025 }, resultKey: "sp_ratings" },
    { argv: ["ratings", "sp", "conferences"], adapter: "conferenceSpRatings", command: "ratings sp conferences", endpoint: "/ratings/sp/conferences", query: {}, resultKey: "conference_sp_ratings" },
    { argv: ["ratings", "srs", "--year", "2025"], adapter: "srsRatings", command: "ratings srs", endpoint: "/ratings/srs", query: { year: 2025 }, resultKey: "srs_ratings" },
    { argv: ["ratings", "srs", "expanded", "--year", "2025"], adapter: "expandedSrsRatings", command: "ratings srs expanded", endpoint: "/ratings/srs/expanded", query: { year: 2025 }, resultKey: "expanded_srs_ratings" },
    { argv: ["ratings", "elo"], adapter: "eloRatings", command: "ratings elo", endpoint: "/ratings/elo", query: {}, resultKey: "elo_ratings" },
    { argv: ["ratings", "fpi", "--year", "2025"], adapter: "fpiRatings", command: "ratings fpi", endpoint: "/ratings/fpi", query: { year: 2025 }, resultKey: "fpi_ratings" },
    { argv: ["rankings", "--year", "2025"], adapter: "rankings", command: "rankings", endpoint: "/rankings", query: { year: 2025 }, resultKey: "rankings" },
    { argv: ["draft", "teams"], adapter: "draftTeams", command: "draft teams", endpoint: "/draft/teams", query: {}, resultKey: "draft_teams" },
    { argv: ["draft", "positions"], adapter: "draftPositions", command: "draft positions", endpoint: "/draft/positions", query: {}, resultKey: "draft_positions" },
    { argv: ["draft", "picks"], adapter: "draftPicks", command: "draft picks", endpoint: "/draft/picks", query: {}, resultKey: "draft_picks" },
    { argv: ["coaches"], adapter: "coaches", command: "coaches", endpoint: "/coaches", query: {}, resultKey: "coaches" },
    { argv: ["coaches", "profile", "--coach-id", "123"], adapter: "coachProfile", command: "coaches profile", endpoint: "/coaches/profile", query: { coachId: 123 }, resultKey: "coach_profile" },
    { argv: ["coaches", "seasons"], adapter: "coachSeasons", command: "coaches seasons", endpoint: "/coaches/seasons", query: {}, resultKey: "coach_seasons" },
    { argv: ["coaches", "tenures"], adapter: "coachTenures", command: "coaches tenures", endpoint: "/coaches/tenures", query: {}, resultKey: "coach_tenures" },
  ];

  test.each(routes)("routes $command to $endpoint", async (route) => {
    const { call, document } = await runRegisteredRoute(route);
    expect(call).toEqual({
      method: route.adapter,
      query: route.adapter === "draftTeams" || route.adapter === "draftPositions"
        ? undefined
        : route.query,
    });
    expect(document).toMatchObject({
      command: route.command,
      endpoint: route.endpoint,
      query: snakeCaseDeep(route.query),
      count: route.adapter === "coachProfile" ? 1 : 0,
      [route.resultKey]: route.adapter === "coachProfile" ? {} : [],
    });
  });
});

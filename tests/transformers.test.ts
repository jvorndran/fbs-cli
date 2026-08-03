import { describe, expect, test } from "bun:test";
import type {
  AdvancedGameStat,
  AdvancedSeasonStat,
  Drive,
  Game,
  GamePlayerStats,
  GameTeamStats,
  GameTeamStatsTeamStat,
  GameWeather,
  Play,
  PlayerUsage,
  PlayStat,
  RosterPlayer,
  Team,
  UserUsage,
} from "cfbd";

import {
  transformAdvancedGameStats,
  transformAdvancedSeasonStats,
} from "../src/transformers/advanced-stats.ts";
import {
  formatClock,
  omitNullish,
  parseStatValue,
  toSnakeCase,
  toSnakeCaseValue,
} from "../src/transformers/common.ts";
import { transformDrives } from "../src/transformers/drives.ts";
import { transformGames } from "../src/transformers/games.ts";
import { transformPlayStats } from "../src/transformers/play-stats.ts";
import { transformPlayerGameStats } from "../src/transformers/player-game-stats.ts";
import { transformPlayerUsage } from "../src/transformers/player-usage.ts";
import { transformPlays } from "../src/transformers/plays.ts";
import { transformRoster } from "../src/transformers/roster.ts";
import {
  transformStatPairs,
  transformTeamGameStats,
} from "../src/transformers/team-game-stats.ts";
import { transformTeams } from "../src/transformers/teams.ts";
import { transformUsage } from "../src/transformers/usage.ts";
import { transformWeather } from "../src/transformers/weather.ts";
import { loadFixture } from "./helpers/fixture.ts";

describe("common transformer helpers", () => {
  test("snake-cases camelCase, acronyms, and provider labels", () => {
    expect(toSnakeCase("totalPPA")).toBe("total_ppa");
    expect(toSnakeCase("C/ATT")).toBe("c_att");
    expect(toSnakeCase("  Time of Possession  ")).toBe("time_of_possession");
  });

  test("recursively removes only nullish values", () => {
    expect(
      omitNullish({
        missing: null,
        absent: undefined,
        zero: 0,
        no: false,
        blank: "",
        empty: [],
        nested: { gone: null, present: 0 },
      }),
    ).toEqual({
      zero: 0,
      no: false,
      blank: "",
      empty: [],
      nested: { present: 0 },
    });
  });

  test("recursively snake-cases nested object keys without rounding", () => {
    expect(
      toSnakeCaseValue({
        averagePPA: 0.1234567890123,
        passingPlays: { successRate: 0.4567890123456, nullable: null },
      }),
    ).toEqual({
      average_ppa: 0.1234567890123,
      passing_plays: { success_rate: 0.4567890123456 },
    });
  });

  test("formats clocks as MM:SS and preserves zeroes", () => {
    expect(formatClock({ minutes: 14, seconds: 2 })).toBe("14:02");
    expect(formatClock({ minutes: 0, seconds: 0 })).toBe("00:00");
    expect(formatClock({ minutes: null, seconds: 9 })).toBeUndefined();
    expect(formatClock({ minutes: null, seconds: null })).toBeUndefined();
  });

  test.each([
    ["412", 412],
    ["-2.50", -2.5],
    [".75", 0.75],
    ["0", 0],
    ["21/32", "21/32"],
    ["31:07", "31:07"],
    ["8-12", "8-12"],
  ])("converts only unambiguous numeric stat %s", (raw, expected) => {
    expect(parseStatValue(raw as string)).toBe(expected);
  });
});

describe("endpoint transformers", () => {
  test("teams preserves identity, branding, booleans, and nested venue data", async () => {
    const fixture = await loadFixture<Team[]>("teams");
    const [team] = transformTeams(fixture);

    expect(team).toMatchObject({
      id: 52,
      school: "Florida State",
      alternate_names: ["Florida State University"],
      alternate_color: "#CEB888",
      location: {
        id: 3697,
        country_code: "US",
        construction_year: 1950,
        grass: true,
        dome: false,
      },
    });
    expect(team).not.toHaveProperty("division");
    expect(team?.location).not.toHaveProperty("zip");
  });

  test("games groups sides, derives status and matchup, and retains metadata", async () => {
    const fixture = await loadFixture<Game[]>("games");
    const [completed, scheduled] = transformGames(fixture);

    expect(completed).toMatchObject({
      id: 401752731,
      completed: true,
      status: "completed",
      matchup: "Alabama at Florida State",
      start_time_tbd: false,
      home: {
        id: 52,
        team: "Florida State",
        points: 31,
        line_scores: [7, 10, 7, 7],
        postgame_win_probability: 0.87654321,
      },
      away: { id: 333, team: "Alabama", points: 17 },
      excitement_index: 6.123456789,
      playoff: {
        competition: "cfp",
        round_name: "Quarterfinal",
        home_seed: 4,
      },
    });
    expect(completed).not.toHaveProperty("notes");
    expect(scheduled).toMatchObject({
      id: 401752732,
      completed: false,
      status: "not_completed",
      home: { id: 52, team: "Florida State" },
      away: { id: 2390, team: "Miami" },
      notes: "Kickoff time pending",
    });
    expect(scheduled?.home).not.toHaveProperty("points");
  });

  test("roster combines names and keeps string IDs, zeroes, and recruiting IDs", async () => {
    const fixture = await loadFixture<RosterPlayer[]>("roster");
    const [player, zeroValues] = transformRoster(fixture);

    expect(player).toEqual({
      id: "4433971",
      name: "Example Player",
      team: "Florida State",
      position: "QB",
      jersey: 10,
      year: 3,
      height_inches: 74,
      weight_lbs: 215,
      hometown: {
        city: "Jacksonville",
        state: "FL",
        country: "USA",
        latitude: 30.3322,
        longitude: -81.6557,
        county_fips: "12031",
      },
      recruit_ids: ["987654"],
    });
    expect(zeroValues).toMatchObject({
      id: "9007199254740993",
      jersey: 0,
      recruit_ids: [],
    });
    expect(zeroValues).not.toHaveProperty("hometown");
  });

  test("team game stats normalize categories and only parse plain numbers", async () => {
    const fixture = await loadFixture<GameTeamStats[]>("team-game-stats");
    const [game] = transformTeamGameStats(fixture);
    const firstTeam = (game?.teams as Array<Record<string, unknown>>)[0];

    expect(game?.game_id).toBe(401752731);
    expect(firstTeam).toMatchObject({
      team_id: 52,
      home_away: "home",
      stats: {
        total_yards: 412,
        rushing_yards: 156.5,
        completion_attempts: "21/32",
        time_of_possession: "31:07",
        turnovers: 0,
      },
    });
  });

  test("team game stats reject normalized category collisions", () => {
    const stats = [
      { category: "Total Yards", stat: "412" },
      { category: "total_yards", stat: "399" },
    ] as GameTeamStatsTeamStat[];

    expect(() => transformStatPairs(stats)).toThrow(
      expect.objectContaining({
        code: "cfbd_invalid_response",
        message:
          "CFBD returned duplicate team stat category 'total_yards' after normalization.",
      }),
    );
  });

  test("player game stats flatten every athlete stat into explicit rows", async () => {
    const fixture = await loadFixture<GamePlayerStats[]>("player-game-stats");
    const rows = transformPlayerGameStats(fixture);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      game_id: 401752731,
      team: "Florida State",
      home_away: "home",
      player_id: "4433971",
      player: "Example Player",
      category: "passing",
      stat_type: "C/ATT",
      value: "21/32",
    });
    expect(rows[1]?.value).toBe(245);
    expect(rows[2]).toMatchObject({
      player_id: "9007199254740993",
      value: 0,
    });
  });

  test("drives group start/end context and format all clocks", async () => {
    const fixture = await loadFixture<Drive[]>("drives");
    const [drive] = transformDrives(fixture);

    expect(drive).toMatchObject({
      id: "drive-9007199254740993",
      game_id: 401752731,
      drive_number: 1,
      is_home_offense: true,
      start: {
        period: 1,
        clock: "15:00",
        yard_line: 25,
        yards_to_goal: 75,
        offense_score: 0,
        defense_score: 0,
        score: "0-0",
      },
      end: {
        clock: "10:42",
        yards_to_goal: 0,
        offense_score: 7,
        defense_score: 0,
        score: "7-0",
      },
      elapsed: "04:18",
      scoring: true,
    });
    expect(drive).not.toHaveProperty("defense_conference");
  });

  test("plays retain analytical fields, precision, zeroes, and string IDs", async () => {
    const fixture = await loadFixture<Play[]>("plays");
    const [play, zeroPlay] = transformPlays(fixture);

    expect(play).toMatchObject({
      id: "play-9007199254740993",
      drive_id: "drive-9007199254740993",
      game_id: 401752731,
      clock: "14:02",
      yard_line: 25,
      yards_to_goal: 75,
      play_type: "Rush",
      yards_gained: 6,
      ppa: 0.210987654321,
      scoring: false,
      description: "Example runner rushed for 6 yards.",
    });
    expect(zeroPlay).toMatchObject({
      clock: "00:00",
      offense_score: 0,
      defense_score: 0,
      down: 0,
      distance: 0,
      yard_line: 0,
      yards_to_goal: 0,
      yards_gained: 0,
      scoring: false,
    });
    expect(zeroPlay).not.toHaveProperty("description");
    expect(zeroPlay).not.toHaveProperty("ppa");
  });

  test("play stats preserve player/play associations and numeric precision", async () => {
    const fixture = await loadFixture<PlayStat[]>("play-stats");
    const [stat] = transformPlayStats(fixture);

    expect(stat).toEqual({
      game_id: 401752731,
      play_id: "play-9007199254740993",
      drive_id: "drive-9007199254740993",
      season: 2026,
      week: 1,
      team: "Florida State",
      conference: "ACC",
      opponent: "Alabama",
      team_score: 7,
      opponent_score: 0,
      athlete_id: "9007199254740993",
      athlete: "Example Player",
      stat_type: "Rush",
      value: 6.125,
      period: 1,
      clock: "14:02",
      down: 1,
      distance: 10,
      yards_to_goal: 75,
    });
  });

  test("advanced game stats stay nested, snake-case recursively, and omit nulls", async () => {
    const fixture = await loadFixture<AdvancedGameStat[]>(
      "advanced-game-stats",
    );
    const [stat] = transformAdvancedGameStats(fixture);

    expect(stat).toMatchObject({
      game_id: 401752731,
      season: 2026,
      season_type: "regular",
      week: 1,
      team: "Florida State",
      opponent: "Alabama",
      offense: {
        plays: 72,
        drives: 11,
        ppa: 0.18,
        success_rate: 0.46,
        explosiveness: 1.210987654321,
        passing_plays: {
          total_ppa: 9.6,
          success_rate: 0.49,
        },
        rushing_plays: {
          ppa: 0.11,
          success_rate: 0.43,
        },
      },
      defense: {
        plays: 68,
        ppa: -0.07,
        success_rate: 0.37,
      },
    });
    expect(
      (stat?.offense as Record<string, unknown>).rushing_plays,
    ).not.toHaveProperty("explosiveness");
    expect(stat).not.toHaveProperty("offense.rushingPlays");
  });

  test("advanced season stats retain offense/defense hierarchy and precision", async () => {
    const fixture = await loadFixture<AdvancedSeasonStat[]>(
      "advanced-season-stats",
    );
    const [stat] = transformAdvancedSeasonStats(fixture);

    expect(stat).toMatchObject({
      season: 2026,
      team: "Florida State",
      conference: "ACC",
      offense: {
        total_opportunies: 51,
        explosiveness: 1.210987654321,
        havoc: { db: 0.04, front_seven: 0.09, total: 0.13 },
        field_position: {
          average_predicted_points: 1.37,
          average_start: 71.2,
        },
      },
      defense: {
        total_opportunies: 44,
        ppa: -0.07,
        field_position: { average_start: 73.1 },
      },
    });
    expect(
      (stat?.defense as Record<string, unknown>).field_position,
    ).not.toHaveProperty("average_predicted_points");
  });

  test("player usage keeps dimensions nested and preserves string IDs", async () => {
    const fixture = await loadFixture<PlayerUsage[]>("player-usage");
    const [player] = transformPlayerUsage(fixture);

    expect(player).toEqual({
      season: 2026,
      player_id: "9007199254740993",
      player: "Example Player",
      position: "QB",
      team: "Florida State",
      conference: "ACC",
      usage: {
        standard_downs: 0.68,
        third_down: 0.76,
        second_down: 0.73,
        first_down: 0.69,
        rush: 0.18,
        pass: 0.92,
        overall: 0.710987654321,
      },
    });
  });

  test("weather groups matchup and conditions while retaining false and zero", async () => {
    const fixture = await loadFixture<GameWeather[]>("weather");
    const [game] = transformWeather(fixture);

    expect(game).toMatchObject({
      game_id: 401752731,
      matchup: "Alabama at Florida State",
      indoors: false,
      home: { team: "Florida State", conference: "ACC" },
      away: { team: "Alabama", conference: "SEC" },
      conditions: {
        summary: "Light rain",
        temperature_f: 82,
        precipitation_inches: 0.08,
        snowfall_inches: 0,
        wind_direction_degrees: 180,
        pressure: 1011.125,
      },
    });
    expect(game?.conditions).not.toHaveProperty("code");
  });

  test("usage preserves its window, totals, endpoint rows, and recent requests", async () => {
    const fixture = await loadFixture<UserUsage>("usage");

    expect(transformUsage(fixture)).toEqual({
      window: {
        start: "2026-07-25T00:00:00.000Z",
        end: "2026-07-31T23:59:59.999Z",
      },
      api: "all",
      totals: {
        requests: 12,
        cfb_requests: 12,
        cbb_requests: 0,
        unique_endpoints: 3,
      },
      top_endpoints: [
        {
          api: "cfb",
          endpoint: "/games",
          requests: 8,
          last_used_at: "2026-07-31T12:00:00.000Z",
        },
      ],
      recent_requests: [
        {
          api: "cfb",
          endpoint: "/plays",
          requested_at: "2026-07-31T12:01:00.000Z",
        },
      ],
    });
    expect(transformUsage(null)).toEqual({});
  });
});

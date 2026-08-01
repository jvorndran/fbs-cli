import type {
  AdvancedBoxScore,
  BettingGame,
  CalendarWeek,
  CfpPlayoff,
  Conference,
  GameMedia,
  LiveGame,
  Matchup,
  PlayoffMatchup,
  PlayoffParticipant,
  PlayStatType,
  PlayType,
  ScoreboardGame,
  Team,
  TeamATS,
  TeamRecords,
  TeamTalent,
  UserInfo,
  Venue,
} from "cfbd";

import {
  compactObject,
  toSnakeCaseObject,
  type AgentObject,
} from "./common.ts";
import { transformTeams } from "./teams.ts";

function transformObjects(values: readonly object[]): AgentObject[] {
  return values.map(toSnakeCaseObject);
}

export function transformReferenceTeams(teams: readonly Team[]): AgentObject[] {
  return transformTeams(teams);
}

export function transformMatchup(matchup: Matchup): AgentObject {
  return compactObject({
    team_1: matchup.team1,
    team_2: matchup.team2,
    start_year: matchup.startYear,
    end_year: matchup.endYear,
    team_1_wins: matchup.team1Wins,
    team_2_wins: matchup.team2Wins,
    ties: matchup.ties,
    games: transformObjects(matchup.games),
  });
}

export function transformConferences(
  conferences: readonly Conference[],
): AgentObject[] {
  return transformObjects(conferences);
}

export function transformTalent(talent: readonly TeamTalent[]): AgentObject[] {
  return transformObjects(talent);
}

export function transformVenues(venues: readonly Venue[]): AgentObject[] {
  return transformObjects(venues);
}

export function transformPlayTypes(types: readonly PlayType[]): AgentObject[] {
  return transformObjects(types);
}

export function transformPlayStatTypes(
  types: readonly PlayStatType[],
): AgentObject[] {
  return transformObjects(types);
}

export function transformCfpPlayoff(playoff: CfpPlayoff): AgentObject {
  return toSnakeCaseObject(playoff);
}

export function transformCfpParticipants(
  participants: readonly PlayoffParticipant[],
): AgentObject[] {
  return transformObjects(participants);
}

export function transformCfpGames(
  games: readonly PlayoffMatchup[],
): AgentObject[] {
  return transformObjects(games);
}

export function transformGameMedia(media: readonly GameMedia[]): AgentObject[] {
  return transformObjects(media);
}

export function transformLivePlays(game: LiveGame): AgentObject {
  return toSnakeCaseObject(game);
}

export function transformLines(games: readonly BettingGame[]): AgentObject[] {
  return games.map((game) =>
    compactObject({
      id: game.id,
      season: game.season,
      week: game.week,
      season_type: game.seasonType,
      start_date: game.startDate,
      matchup: `${game.awayTeam} at ${game.homeTeam}`,
      home: compactObject({
        id: game.homeTeamId,
        team: game.homeTeam,
        conference: game.homeConference,
        classification: game.homeClassification,
        score: game.homeScore,
      }),
      away: compactObject({
        id: game.awayTeamId,
        team: game.awayTeam,
        conference: game.awayConference,
        classification: game.awayClassification,
        score: game.awayScore,
      }),
      lines: transformObjects(game.lines),
    }),
  );
}

export function transformTeamAts(summaries: readonly TeamATS[]): AgentObject[] {
  return transformObjects(summaries);
}

export function transformUserInfo(info: UserInfo | null): AgentObject {
  return info === null ? {} : toSnakeCaseObject(info);
}

export function transformRecords(records: readonly TeamRecords[]): AgentObject[] {
  return transformObjects(records);
}

export function transformCalendar(weeks: readonly CalendarWeek[]): AgentObject[] {
  return transformObjects(weeks);
}

export function transformScoreboard(games: readonly ScoreboardGame[]): AgentObject[] {
  return games.map((game) =>
    compactObject({
      id: game.id,
      start_date: game.startDate,
      start_time_tbd: game.startTimeTBD,
      status: game.status,
      period: game.period,
      clock: game.clock,
      situation: game.situation,
      possession: game.possession,
      last_play: game.lastPlay,
      tv: game.tv,
      neutral_site: game.neutralSite,
      conference_game: game.conferenceGame,
      matchup: `${game.awayTeam.name} at ${game.homeTeam.name}`,
      venue: toSnakeCaseObject(game.venue),
      home: toSnakeCaseObject(game.homeTeam),
      away: toSnakeCaseObject(game.awayTeam),
      weather: toSnakeCaseObject(game.weather),
      betting: toSnakeCaseObject(game.betting),
    }),
  );
}

export function transformAdvancedBoxScore(boxScore: AdvancedBoxScore): AgentObject {
  return compactObject({
    game_info: toSnakeCaseObject(boxScore.gameInfo),
    teams: toSnakeCaseObject(boxScore.teams),
    players: toSnakeCaseObject(boxScore.players),
  });
}

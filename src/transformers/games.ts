import type { Game } from "cfbd";

import {
  compactObject,
  toSnakeCaseObject,
  type AgentObject,
} from "./common.ts";

function transformHomeTeam(game: Game): AgentObject {
  return compactObject({
    id: game.homeId,
    team: game.homeTeam,
    conference: game.homeConference,
    classification: game.homeClassification,
    points: game.homePoints,
    line_scores: game.homeLineScores,
    postgame_win_probability: game.homePostgameWinProbability,
    pregame_elo: game.homePregameElo,
    postgame_elo: game.homePostgameElo,
  });
}

function transformAwayTeam(game: Game): AgentObject {
  return compactObject({
    id: game.awayId,
    team: game.awayTeam,
    conference: game.awayConference,
    classification: game.awayClassification,
    points: game.awayPoints,
    line_scores: game.awayLineScores,
    postgame_win_probability: game.awayPostgameWinProbability,
    pregame_elo: game.awayPregameElo,
    postgame_elo: game.awayPostgameElo,
  });
}

export function transformGames(games: readonly Game[]): AgentObject[] {
  return games.map((game) =>
    compactObject({
      id: game.id,
      season: game.season,
      week: game.week,
      season_type: game.seasonType,
      start_date: game.startDate,
      start_time_tbd: game.startTimeTBD,
      completed: game.completed,
      status: game.completed ? "completed" : "not_completed",
      matchup: `${game.awayTeam} at ${game.homeTeam}`,
      neutral_site: game.neutralSite,
      conference_game: game.conferenceGame,
      attendance: game.attendance,
      home: transformHomeTeam(game),
      away: transformAwayTeam(game),
      venue_id: game.venueId,
      venue: game.venue,
      excitement_index: game.excitementIndex,
      highlights: game.highlights,
      notes: game.notes,
      playoff:
        game.playoff === null ? undefined : toSnakeCaseObject(game.playoff),
    }),
  );
}

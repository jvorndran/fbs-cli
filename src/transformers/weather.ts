import type { GameWeather } from "cfbd";

import {
  compactObject,
  type AgentObject,
} from "./common.ts";

export function transformWeather(weather: readonly GameWeather[]): AgentObject[] {
  return weather.map((game) =>
    compactObject({
      game_id: game.id,
      season: game.season,
      week: game.week,
      season_type: game.seasonType,
      start_time: game.startTime,
      matchup: `${game.awayTeam} at ${game.homeTeam}`,
      home: compactObject({
        team: game.homeTeam,
        conference: game.homeConference,
      }),
      away: compactObject({
        team: game.awayTeam,
        conference: game.awayConference,
      }),
      venue_id: game.venueId,
      venue: game.venue,
      indoors: game.gameIndoors,
      conditions: compactObject({
        summary: game.weatherCondition,
        code: game.weatherConditionCode,
        temperature_f: game.temperature,
        dew_point_f: game.dewPoint,
        humidity_percent: game.humidity,
        precipitation_inches: game.precipitation,
        snowfall_inches: game.snowfall,
        wind_speed_mph: game.windSpeed,
        wind_direction_degrees: game.windDirection,
        pressure: game.pressure,
      }),
    }),
  );
}

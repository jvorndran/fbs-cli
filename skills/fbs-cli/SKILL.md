---
name: fbs-cli
description: Use the FBS CLI to configure a CollegeFootballData API key and research teams, rosters, schedules, games, box scores, drives, plays, player and team statistics, historical betting lines and ATS records, PPA, win probability, WEPA, ratings, rankings, recruiting, transfers, returning production, playoffs, draft history, coaches, venues, weather, live data, and account usage. Trigger for FBS CLI setup, college-football data retrieval, command or filter selection, multi-endpoint research flows, YAML parsing, and CLI error recovery.
---

# Use the FBS CLI

Query CFBD through endpoint-shaped commands, then perform analysis on the returned YAML. The CLI implements all 71 GET routes in the pinned `cfbd` 5.21.0 client. Betting-related endpoints are historical and read-only.

## Prepare

1. Use Node.js >=22.12.0 and install the command with `npm install --global @jvorndran/fbs-cli`. For occasional use, run `npx @jvorndran/fbs-cli <arguments>` instead.
2. Configure `CFBD_API_KEY` manually in the environment or in `.env` in the current directory. As a convenience, the user can run `fbs auth` from that directory. In an interactive terminal, the command explains what it will validate and save before showing the masked prompt. It validates the entered key with exactly one `GET /info` request, then creates or updates the same `.env` file while preserving other entries. A failed validation leaves `.env` unchanged; piped use emits no explanation or prompt.
3. Never place the key in a command argument, log, issue, or agent prompt. `.env` is plaintext and must remain ignored by Git.
4. Respect credential precedence: `CFBD_API_KEY` already set in the environment, then `CFBD_API_KEY` in the current directory's `.env`. There is no global or operating-system-specific credential store.
5. From this repository, replace `fbs` with `bun run src/cli.ts` when needed; Bun 1.3+ is a development tool and is not required by npm users.
6. Run `fbs --help` for top-level families and `fbs <command path> --help` for the exact accepted flags, enum choices, rules, and examples.
7. Quote multiword values, scope live queries narrowly because each call consumes CFBD quota, and prefer returned provider IDs for follow-up game, player, coach, and play queries.

## Choose an endpoint command

The final YAML collection uses the result key shown after each endpoint.

### Teams, account, and reference data

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs info` | `/info` -> `info` | No filters. |
| `fbs info usage` | `/info/usage` -> `usage` | Optional; `--days` is 1-31 and `--limit` is 1-50. |
| `fbs conferences` | `/conferences` -> `conferences` | No filters. |
| `fbs talent` | `/talent` -> `talent` | Require `--year`. |
| `fbs venues` | `/venues` -> `venues` | No filters. |
| `fbs records` | `/records` -> `records` | Require `--year` or `--team`. |
| `fbs calendar` | `/calendar` -> `calendar` | Require `--year`. |
| `fbs scoreboard` | `/scoreboard` -> `scoreboard` | Filters optional; may require an eligible tier and can include embedded betting fields. |
| `fbs teams` | `/teams` -> `teams` | Filters optional. |
| `fbs teams fbs` | `/teams/fbs` -> `teams` | Optional `--year`. |
| `fbs teams matchup` | `/teams/matchup` -> `matchup` | Require `--team1` and `--team2`; keep `--min-year <= --max-year`. |
| `fbs teams ats` | `/teams/ats` -> `team_ats` | Require `--year`; optional `--team` and `--conference`. |
| `fbs roster` | `/roster` -> `players` | Filters optional. |

### Games, box scores, and live data

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs games` | `/games` -> `games` | Require `--id` or `--year`; `--round` requires `--competition cfp`. |
| `fbs games teams` | `/games/teams` -> `games` | Require `--id`, or `--year` plus `--week`, `--team`, or `--conference`. |
| `fbs games players` | `/games/players` -> `player_stats` | Same ID-or-scoped-year rule as `games teams`. |
| `fbs games weather` | `/games/weather` -> `weather` | Require `--game-id` or `--year`; may require an eligible tier. |
| `fbs games media` | `/games/media` -> `media` | Require `--year`. |
| `fbs lines` | `/lines` -> `lines` | Require `--game-id` or `--year`; accepts `--game-id`, `--year`, `--week`, `--season-type`, `--team`, `--home`, `--away`, `--conference`, `--provider`. |
| `fbs game box advanced` | `/game/box/advanced` -> `box_score` | Require `--id`; may require an eligible tier. |
| `fbs live plays` | `/live/plays` -> `live_game` | Require `--game-id`; may require an eligible tier. |

### Drives and plays

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs drives` | `/drives` -> `drives` | Require `--year`. |
| `fbs plays` | `/plays` -> `plays` | Require both `--year` and `--week`. |
| `fbs plays stats` | `/plays/stats` -> `play_stats` | Filters optional; scope narrowly because CFBD caps results at 2,000 rows and the CLI does not page. |
| `fbs plays stats types` | `/plays/stats/types` -> `play_stat_types` | No filters. |
| `fbs plays types` | `/plays/types` -> `play_types` | No filters. |

### Team and player statistics

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs stats game advanced` | `/stats/game/advanced` -> `advanced_game_stats` | Require `--year` or `--team`. |
| `fbs stats game havoc` | `/stats/game/havoc` -> `game_havoc_stats` | Require `--year` or `--team`. |
| `fbs stats season` | `/stats/season` -> `team_stats` | Require `--year` or `--team`; keep `--start-week <= --end-week`. |
| `fbs stats season advanced` | `/stats/season/advanced` -> `advanced_season_stats` | Same year/team and week-range rules. |
| `fbs stats player season` | `/stats/player/season` -> `player_season_stats` | Require `--year`; keep the week range ordered. |
| `fbs stats player success` | `/stats/player/success` -> `player_success_rates` | Require `--year` or `--player-id`; keep the week range ordered. |
| `fbs stats player success game` | `/stats/player/success/game` -> `player_game_success_rates` | Require `--year` plus `--week`, `--team`, or `--player-id`. |
| `fbs stats categories` | `/stats/categories` -> `categories` | No filters. |
| `fbs player usage` | `/player/usage` -> `player_usage` | Require `--year`. |
| `fbs player search` | `/player/search` -> `players` | Require `--search-term`. |
| `fbs player season overview` | `/player/season/overview` -> `player_season_overview` | Require `--year` and `--player-id`. |
| `fbs player returning` | `/player/returning` -> `returning_production` | Require `--year` or `--team`. |
| `fbs player portal` | `/player/portal` -> `transfers` | Require `--year`. |

### PPA and probability metrics

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs ppa predicted` | `/ppa/predicted` -> `predicted_points` | Require `--down` and `--distance`; down is 1-4. |
| `fbs ppa teams` | `/ppa/teams` -> `team_ppa` | Require `--year` or `--team`. |
| `fbs ppa games` | `/ppa/games` -> `game_ppa` | Require `--year`. |
| `fbs ppa players games` | `/ppa/players/games` -> `player_game_ppa` | Require `--year` plus `--week` or `--team`. |
| `fbs ppa players season` | `/ppa/players/season` -> `player_season_ppa` | Require `--year` or `--player-id`. |
| `fbs metrics wp` | `/metrics/wp` -> `win_probability` | Require `--game-id`. |
| `fbs metrics wp pregame` | `/metrics/wp/pregame` -> `pregame_win_probabilities` | Filters optional. |
| `fbs metrics fg ep` | `/metrics/fg/ep` -> `field_goal_expected_points` | No filters. |

### Opponent-adjusted metrics

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs wepa team season` | `/wepa/team/season` -> `team_metrics` | Filters optional. |
| `fbs wepa players passing` | `/wepa/players/passing` -> `player_metrics` | Filters optional. |
| `fbs wepa players rushing` | `/wepa/players/rushing` -> `player_metrics` | Filters optional. |
| `fbs wepa players kicking` | `/wepa/players/kicking` -> `kicker_ratings` | Filters optional. |

### Recruiting, ratings, and rankings

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs recruiting players` | `/recruiting/players` -> `recruits` | Require `--year` or `--team`. |
| `fbs recruiting teams` | `/recruiting/teams` -> `team_rankings` | Filters optional. |
| `fbs recruiting groups` | `/recruiting/groups` -> `recruiting_groups` | Filters optional; keep `--start-year <= --end-year`. |
| `fbs ratings sp` | `/ratings/sp` -> `sp_ratings` | Require `--year` or `--team`. |
| `fbs ratings sp conferences` | `/ratings/sp/conferences` -> `conference_sp_ratings` | Filters optional. |
| `fbs ratings srs` | `/ratings/srs` -> `srs_ratings` | Require `--year` or `--team`. |
| `fbs ratings srs expanded` | `/ratings/srs/expanded` -> `expanded_srs_ratings` | Require `--year` or `--team`. |
| `fbs ratings elo` | `/ratings/elo` -> `elo_ratings` | Filters optional. |
| `fbs ratings fpi` | `/ratings/fpi` -> `fpi_ratings` | Require `--year` or `--team`. |
| `fbs rankings` | `/rankings` -> `rankings` | Require `--year`. |

### Playoffs, draft, and coaches

| Command | Endpoint -> key | Required rule |
|---|---|---|
| `fbs playoffs cfp` | `/playoffs/cfp` -> `playoff` | Require `--year`. |
| `fbs playoffs cfp participants` | `/playoffs/cfp/participants` -> `participants` | Require `--year`. |
| `fbs playoffs cfp games` | `/playoffs/cfp/games` -> `games` | Require `--year`. |
| `fbs draft teams` | `/draft/teams` -> `draft_teams` | No filters. |
| `fbs draft positions` | `/draft/positions` -> `draft_positions` | No filters. |
| `fbs draft picks` | `/draft/picks` -> `draft_picks` | Filters optional. |
| `fbs coaches` | `/coaches` -> `coaches` | Filters optional; keep `--min-year <= --max-year`. |
| `fbs coaches profile` | `/coaches/profile` -> `coach_profile` | Require `--coach-id`. |
| `fbs coaches seasons` | `/coaches/seasons` -> `coach_seasons` | Filters optional; keep `--min-year <= --max-year`. |
| `fbs coaches tenures` | `/coaches/tenures` -> `coach_tenures` | Filters optional; `--active` accepts `true` or `false`. |

## Apply filters correctly

Use executable help instead of guessing:

```bash
fbs games --help
fbs lines --help
fbs teams ats --help
fbs stats player success game --help
fbs recruiting groups --help
```

Use these shared enum domains:

- `--season-type`: `regular`, `postseason`, `both`, `allstar`, `spring_regular`, `spring_postseason`
- Division `--classification`: `fbs`, `fcs`, `ii`, `iii`
- Recruiting `--classification` and `--recruit-type`: `JUCO`, `PrepSchool`, `HighSchool`
- `--media-type`: `tv`, `radio`, `web`, `ppv`, `mobile`
- `--competition` and `--poll`: `cfp`
- `--round`: `first_round`, `quarterfinal`, `semifinal`, `championship`
- `--api`: `all`, `cfb`, `cbb`

Treat kebab-case flags as direct mappings to CFBD fields: `--game-id` maps to `gameId`, `--player-id` to `playerId`, `--season-type` to `seasonType`, and so on. Do not invent aliases. Bare switches such as `--exclude-garbage-time`, `--latest`, and `--final` are boolean true.

## Run research flows

### Inspect one game

```bash
fbs games --year 2026 --week 1 --team "Florida State"
fbs games teams --id 401752731
fbs games players --id 401752731
fbs drives --year 2026 --week 1 --team "Florida State"
fbs plays --year 2026 --week 1 --team "Florida State"
fbs metrics wp --game-id 401752731
```

Read `games[].id` from the first response and reuse it. Add weather, live plays, or the advanced box only when relevant and report tier failures as failures.

### Profile a team or player

```bash
fbs roster --year 2026 --team "Florida State"
fbs stats season advanced --year 2026 --team "Florida State"
fbs ppa teams --year 2026 --team "Florida State"
fbs ratings sp --year 2026 --team "Florida State"
fbs player search --search-term "Jordan Travis"
fbs player season overview --year 2023 --player-id 4360248
fbs ppa players season --year 2023 --player-id 4360248
```

### Add historical context

```bash
fbs teams matchup --team1 "Florida State" --team2 Miami --min-year 2000
fbs recruiting groups --team "Florida State" --start-year 2020 --end-year 2025
fbs coaches --team "Florida State"
fbs draft picks --school "Florida State"
fbs playoffs cfp participants --year 2025
```

### Inspect historical betting context

```bash
fbs lines --year 2025 --week 1 --team "Florida State"
fbs lines --game-id 401752731 --provider DraftKings
fbs teams ats --year 2025 --team "Florida State"
fbs scoreboard --conference ACC
```

Use `lines` for historical game/provider spreads, totals, and moneylines. Use `teams ats` for historical against-the-spread summaries. The scoreboard can also include embedded betting fields. Treat all of these as read-only provider observations; the CLI never places or changes a wager.

## Read the YAML contract

Parse one success document from stdout:

```yaml
command: games
endpoint: /games
query:
  year: 2026
count: 1
games: []
```

Verify `command`, `endpoint`, and `query`; use `count` for top-level cardinality; then read the endpoint-specific final key. Expect snake_case keys, omitted nulls, preserved `0`, `false`, IDs, arrays, and numeric precision. Do not expect provider JSON or surrounding prose.

Parse failures from stderr and respect the nonzero exit:

```yaml
error:
  code: cfbd_bad_request
  status: 400
  message: year is required when id is not specified
  command: games
  query:
    team: Florida State
  hint: Supply --year or query a game with --id.
```

Correct deterministic filters from `hint` when present. Preserve validation, authorization, tier, and rate failures in the final account. Do not repeatedly retry broad requests.

For `missing_api_key`, direct the user to set `CFBD_API_KEY` manually or run `fbs auth` to create `.env` in the current directory. Never ask the user to paste the key into the conversation.

## Respect scope

- Treat betting fields, lines, and ATS records as historical read-only data.
- Treat `fbs auth` as the only local-write and interactive operation; it makes one read-only `/info` validation request and updates `.env` only after success.
- Do not expect custom pagination, caching, raw output, format switches, file export, or endpoint writes.
- Do not treat a tier-denied endpoint as an empty successful result.
- Do not infer predictions, rankings, schemes, or opinions from the transformer itself.
- Do not run the live smoke-test suite during research.

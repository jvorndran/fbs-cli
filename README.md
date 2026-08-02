# FBS CLI

`fbs` puts the [CollegeFootballData](https://collegefootballdata.com/) API in your terminal. Search teams and players, inspect games and play-by-play, compare ratings and recruiting, or retrieve historical lines and ATS records across all 71 CFBD GET endpoints. Results are clean YAML that works well in a terminal, script, or agent workflow.

## Quick start

You need [Node.js](https://nodejs.org/) >=22.12.0 and a CollegeFootballData API key.

### 1. Install the CLI

```bash
npm install --global @jvorndran/fbs-cli
```

This adds the `fbs` command on Windows, macOS, and Linux.

### 2. Save your API key

```bash
fbs auth
```

Paste your CollegeFootballData API key at the masked prompt. The command saves it for your user account, but does not make an API request or validate that the key is active. Your first data command will report any authentication problem returned by CFBD.

### 3. Run a command

```bash
fbs --help
fbs games --year 2026 --team "Florida State"
```

Quote team and player names that contain spaces. Use `fbs <command path> --help` to see the flags accepted by any command.

### Run without installing

For occasional use, `npx` can infer the package's `fbs` executable:

```bash
npx @jvorndran/fbs-cli --help
npx @jvorndran/fbs-cli auth
npx @jvorndran/fbs-cli games --year 2026 --team "Florida State"
```

## Credentials

The key saved by `fbs auth` is plaintext in a per-user `credentials.env` file:

| Platform | Location |
|---|---|
| Windows | `%LOCALAPPDATA%\fbs-cli\credentials.env` |
| macOS | `~/Library/Application Support/fbs-cli/credentials.env` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/fbs-cli/credentials.env` |

Run `fbs auth` again to replace the saved key. To remove it, delete only the `credentials.env` file shown for your platform.

On macOS and Linux, the CLI applies `0700` directory and `0600` file permissions on a best-effort basis. On Windows, the file uses the access controls of your LocalAppData folder. Anyone who can read the file can read the key, so do not copy it into a repository, issue, log, or agent prompt.

You can override the saved key for a shell or project. Credentials are checked in this order:

1. `CFBD_API_KEY` already set in the environment
2. `CFBD_API_KEY` in a `.env` file in the current directory
3. The per-user file written by `fbs auth`

For example, a project-specific `.env` can contain:

```env
CFBD_API_KEY=your_key_here
```

An API command without a key fails before making a request:

```yaml
error:
  code: missing_api_key
  message: CFBD_API_KEY is required.
  hint: Run fbs auth, set CFBD_API_KEY, or add it to a .env file.
```

## Command reference

The tables below list every executable endpoint command. All shown flags are accepted; flags are optional unless the rule says otherwise. Quote multiword values. Run `fbs <command path> --help` for descriptions, enum choices, and examples from the executable itself.

### Teams, account, and reference data

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs info` | `/info` -> `info` | None | No filters. |
| `fbs info usage` | `/info/usage` -> `usage` | `--api`, `--days`, `--limit` | Optional; `days` is 1-31 and `limit` is 1-50. |
| `fbs conferences` | `/conferences` -> `conferences` | None | No filters. |
| `fbs talent` | `/talent` -> `talent` | `--year` | Require `--year`. |
| `fbs venues` | `/venues` -> `venues` | None | No filters. |
| `fbs records` | `/records` -> `records` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs calendar` | `/calendar` -> `calendar` | `--year` | Require `--year`. |
| `fbs scoreboard` | `/scoreboard` -> `scoreboard` | `--conference`, `--classification` | Optional; may require an eligible CFBD tier and includes embedded betting fields when supplied by CFBD. |
| `fbs teams` | `/teams` -> `teams` | `--conference`, `--year` | Optional. |
| `fbs teams fbs` | `/teams/fbs` -> `teams` | `--year` | Optional. |
| `fbs teams matchup` | `/teams/matchup` -> `matchup` | `--team1`, `--team2`, `--min-year`, `--max-year` | Require both teams; `min-year <= max-year`. |
| `fbs teams ats` | `/teams/ats` -> `team_ats` | `--year`, `--team`, `--conference` | Require `--year`; returns historical ATS records. |
| `fbs roster` | `/roster` -> `players` | `--year`, `--team`, `--classification` | Optional. |

### Games, box scores, and live data

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs games` | `/games` -> `games` | `--id`, `--year`, `--week`, `--team`, `--home`, `--away`, `--conference`, `--season-type`, `--classification`, `--competition`, `--round` | Require `--id` or `--year`; `--round` requires `--competition cfp`. |
| `fbs games teams` | `/games/teams` -> `games` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification` | Require `--id`, or `--year` plus one of `--week`, `--team`, `--conference`. |
| `fbs games players` | `/games/players` -> `player_stats` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--category`, `--season-type`, `--classification` | Same ID-or-scoped-year rule as `games teams`. |
| `fbs games weather` | `/games/weather` -> `weather` | `--game-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification` | Require `--game-id` or `--year`; may require an eligible tier. |
| `fbs games media` | `/games/media` -> `media` | `--year`, `--week`, `--team`, `--conference`, `--media-type`, `--season-type`, `--classification` | Require `--year`. |
| `fbs lines` | `/lines` -> `lines` | `--game-id`, `--year`, `--week`, `--season-type`, `--team`, `--home`, `--away`, `--conference`, `--provider` | Require `--game-id` or `--year`; returns historical provider lines. |
| `fbs game box advanced` | `/game/box/advanced` -> `box_score` | `--id` | Require `--id`; may require an eligible tier. |
| `fbs live plays` | `/live/plays` -> `live_game` | `--game-id` | Require `--game-id`; may require an eligible tier. |

### Drives and plays

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs drives` | `/drives` -> `drives` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--season-type`, `--classification` | Require `--year`. |
| `fbs plays` | `/plays` -> `plays` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--play-type`, `--season-type`, `--classification` | Require both `--year` and `--week`. |
| `fbs plays stats` | `/plays/stats` -> `play_stats` | `--game-id`, `--athlete-id`, `--stat-type-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type` | Optional; CFBD caps the response at 2,000 rows and the CLI does not page. |
| `fbs plays stats types` | `/plays/stats/types` -> `play_stat_types` | None | No filters. |
| `fbs plays types` | `/plays/types` -> `play_types` | None | No filters. |

### Team and player statistics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs stats game advanced` | `/stats/game/advanced` -> `advanced_game_stats` | `--year`, `--team`, `--week`, `--opponent`, `--season-type`, `--exclude-garbage-time` | Require `--year` or `--team`. |
| `fbs stats game havoc` | `/stats/game/havoc` -> `game_havoc_stats` | `--year`, `--week`, `--team`, `--opponent`, `--season-type` | Require `--year` or `--team`. |
| `fbs stats season` | `/stats/season` -> `team_stats` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--classification` | Require `--year` or `--team`; `start-week <= end-week`. |
| `fbs stats season advanced` | `/stats/season/advanced` -> `advanced_season_stats` | `--year`, `--team`, `--start-week`, `--end-week`, `--classification`, `--exclude-garbage-time` | Require `--year` or `--team`; `start-week <= end-week`. |
| `fbs stats player season` | `/stats/player/season` -> `player_season_stats` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--category`, `--season-type` | Require `--year`; `start-week <= end-week`. |
| `fbs stats player success` | `/stats/player/success` -> `player_success_rates` | `--year`, `--player-id`, `--team`, `--conference`, `--start-week`, `--end-week`, `--threshold`, `--season-type`, `--exclude-garbage-time` | Require `--year` or `--player-id`; `start-week <= end-week`. |
| `fbs stats player success game` | `/stats/player/success/game` -> `player_game_success_rates` | `--year`, `--week`, `--player-id`, `--team`, `--conference`, `--threshold`, `--season-type`, `--exclude-garbage-time` | Require `--year` plus one of `--week`, `--team`, `--player-id`. |
| `fbs stats categories` | `/stats/categories` -> `categories` | None | No filters. |
| `fbs player usage` | `/player/usage` -> `player_usage` | `--year`, `--team`, `--conference`, `--player-id`, `--position`, `--exclude-garbage-time` | Require `--year`. |
| `fbs player search` | `/player/search` -> `players` | `--search-term`, `--year`, `--team`, `--position` | Require `--search-term`. |
| `fbs player season overview` | `/player/season/overview` -> `player_season_overview` | `--year`, `--player-id` | Require both flags. |
| `fbs player returning` | `/player/returning` -> `returning_production` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs player portal` | `/player/portal` -> `transfers` | `--year` | Require `--year`. |

### PPA and probability metrics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs ppa predicted` | `/ppa/predicted` -> `predicted_points` | `--down`, `--distance` | Require both; down is 1-4 and distance is nonnegative. |
| `fbs ppa teams` | `/ppa/teams` -> `team_ppa` | `--year`, `--team`, `--conference`, `--classification`, `--exclude-garbage-time` | Require `--year` or `--team`. |
| `fbs ppa games` | `/ppa/games` -> `game_ppa` | `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--exclude-garbage-time` | Require `--year`. |
| `fbs ppa players games` | `/ppa/players/games` -> `player_game_ppa` | `--year`, `--week`, `--team`, `--position`, `--player-id`, `--threshold`, `--season-type`, `--exclude-garbage-time` | Require `--year` plus `--week` or `--team`. |
| `fbs ppa players season` | `/ppa/players/season` -> `player_season_ppa` | `--year`, `--team`, `--conference`, `--position`, `--player-id`, `--threshold`, `--exclude-garbage-time` | Require `--year` or `--player-id`. |
| `fbs metrics wp` | `/metrics/wp` -> `win_probability` | `--game-id` | Require `--game-id`. |
| `fbs metrics wp pregame` | `/metrics/wp/pregame` -> `pregame_win_probabilities` | `--year`, `--week`, `--team`, `--season-type` | Optional. |
| `fbs metrics fg ep` | `/metrics/fg/ep` -> `field_goal_expected_points` | None | No filters. |

### Opponent-adjusted metrics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs wepa team season` | `/wepa/team/season` -> `team_metrics` | `--year`, `--team`, `--conference` | Optional. |
| `fbs wepa players passing` | `/wepa/players/passing` -> `player_metrics` | `--year`, `--team`, `--conference`, `--position` | Optional. |
| `fbs wepa players rushing` | `/wepa/players/rushing` -> `player_metrics` | `--year`, `--team`, `--conference`, `--position` | Optional. |
| `fbs wepa players kicking` | `/wepa/players/kicking` -> `kicker_ratings` | `--year`, `--team`, `--conference` | Optional. |

### Recruiting, ratings, and rankings

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs recruiting players` | `/recruiting/players` -> `recruits` | `--year`, `--team`, `--classification`, `--position`, `--state` | Require `--year` or `--team`. |
| `fbs recruiting teams` | `/recruiting/teams` -> `team_rankings` | `--year`, `--team` | Optional. |
| `fbs recruiting groups` | `/recruiting/groups` -> `recruiting_groups` | `--conference`, `--start-year`, `--end-year`, `--recruit-type`, `--team` | Optional; `start-year <= end-year`. |
| `fbs ratings sp` | `/ratings/sp` -> `sp_ratings` | `--year`, `--team` | Require `--year` or `--team`. |
| `fbs ratings sp conferences` | `/ratings/sp/conferences` -> `conference_sp_ratings` | `--year`, `--conference`, `--classification` | Optional. |
| `fbs ratings srs` | `/ratings/srs` -> `srs_ratings` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs ratings srs expanded` | `/ratings/srs/expanded` -> `expanded_srs_ratings` | `--year`, `--team`, `--conference`, `--classification` | Require `--year` or `--team`. |
| `fbs ratings elo` | `/ratings/elo` -> `elo_ratings` | `--year`, `--week`, `--team`, `--conference`, `--season-type` | Optional. |
| `fbs ratings fpi` | `/ratings/fpi` -> `fpi_ratings` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs rankings` | `/rankings` -> `rankings` | `--year`, `--week`, `--poll`, `--season-type`, `--latest`, `--final` | Require `--year`. |

### Playoffs, draft, and coaches

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs playoffs cfp` | `/playoffs/cfp` -> `playoff` | `--year` | Require `--year`. |
| `fbs playoffs cfp participants` | `/playoffs/cfp/participants` -> `participants` | `--year` | Require `--year`. |
| `fbs playoffs cfp games` | `/playoffs/cfp/games` -> `games` | `--year`, `--round` | Require `--year`. |
| `fbs draft teams` | `/draft/teams` -> `draft_teams` | None | No filters. |
| `fbs draft positions` | `/draft/positions` -> `draft_positions` | None | No filters. |
| `fbs draft picks` | `/draft/picks` -> `draft_picks` | `--year`, `--team`, `--school`, `--conference`, `--position` | Optional. |
| `fbs coaches` | `/coaches` -> `coaches` | `--first-name`, `--last-name`, `--min-year`, `--max-year`, `--team`, `--year` | Optional; `min-year <= max-year`. |
| `fbs coaches profile` | `/coaches/profile` -> `coach_profile` | `--coach-id` | Require `--coach-id`. |
| `fbs coaches seasons` | `/coaches/seasons` -> `coach_seasons` | `--coach-id`, `--min-year`, `--max-year`, `--team`, `--year` | Optional; `min-year <= max-year`. |
| `fbs coaches tenures` | `/coaches/tenures` -> `coach_tenures` | `--active`, `--coach-id`, `--team`, `--year` | Optional; `--active` accepts `true` or `false`. |

### Enum values and flag mapping

- `--season-type`: `regular`, `postseason`, `both`, `allstar`, `spring_regular`, `spring_postseason`
- Division `--classification`: `fbs`, `fcs`, `ii`, `iii`
- Recruiting `--classification` and `--recruit-type`: `JUCO`, `PrepSchool`, `HighSchool`
- `--media-type`: `tv`, `radio`, `web`, `ppv`, `mobile`
- `--competition`: `cfp`
- `--round`: `first_round`, `quarterfinal`, `semifinal`, `championship`
- `--poll`: `cfp`
- `--api`: `all`, `cfb`, `cbb`

Kebab-case flags map directly to the corresponding CFBD camelCase query fields, such as `--game-id` -> `gameId`, `--player-id` -> `playerId`, `--season-type` -> `seasonType`, and `--exclude-garbage-time` -> `excludeGarbageTime`. Do not invent aliases.

## Research flows

### Discover a game and inspect it

```bash
fbs games --year 2026 --week 1 --team "Florida State"
fbs games teams --id 401752731
fbs games players --id 401752731 --category passing
fbs drives --year 2026 --week 1 --team "Florida State"
fbs plays --year 2026 --week 1 --offense "Florida State"
fbs metrics wp --game-id 401752731
fbs game box advanced --id 401752731
```

Read `games[].id` from the first response and reuse it. The weather, live-play, scoreboard, and advanced-box endpoints may be tier-restricted; authorization failures remain errors.

### Build a team and season profile

```bash
fbs teams --conference ACC --year 2026
fbs roster --year 2026 --team "Florida State"
fbs stats season --year 2026 --team "Florida State"
fbs stats season advanced --year 2026 --team "Florida State"
fbs ppa teams --year 2026 --team "Florida State" --exclude-garbage-time
fbs ratings sp --year 2026 --team "Florida State"
fbs player returning --year 2026 --team "Florida State"
```

### Follow a player from recruiting through production

```bash
fbs recruiting players --year 2023 --team "Florida State"
fbs player search --search-term "Jordan Travis" --team "Florida State"
fbs player season overview --year 2023 --player-id 4360248
fbs stats player season --year 2023 --team "Florida State" --category passing
fbs ppa players season --year 2023 --player-id 4360248
fbs draft picks --school "Florida State"
```

### Compare programs and historical context

```bash
fbs teams matchup --team1 "Florida State" --team2 Miami --min-year 2000
fbs records --team "Florida State"
fbs ratings elo --team "Florida State" --year 2025
fbs recruiting groups --team "Florida State" --start-year 2020 --end-year 2025
fbs coaches --team "Florida State"
fbs playoffs cfp participants --year 2025
```

### Inspect historical betting context

```bash
fbs lines --year 2025 --week 1 --team "Florida State"
fbs lines --game-id 401752731 --provider DraftKings
fbs teams ats --year 2025 --team "Florida State"
fbs scoreboard --conference ACC
```

`fbs lines` returns historical provider spreads, totals, and moneylines; `fbs teams ats` returns historical against-the-spread summaries. The current scoreboard may also contain embedded betting fields when CFBD supplies them. These commands only retrieve provider data and never place or modify a wager.

Keep queries narrow to reduce latency, response size, and quota use. Check `fbs info usage` when availability is uncertain. Perform interpretation after retrieval; transformers organize provider data without creating predictions or opinions.

## Output

Each successful command writes one YAML document to stdout. It identifies the command, CFBD endpoint, supplied query, result count, and endpoint-specific collection:

```yaml
command: games
endpoint: /games
query:
  year: 2026
  team: Florida State
count: 1
games:
  - id: 401752731
    season: 2026
    week: 1
    season_type: regular
    status: completed
    matchup: Alabama at Florida State
```

Keys are snake_case, unavailable values are omitted, and provider IDs and numeric precision are preserved. The final collection key matches the result key in the command tables above.

Failures write YAML to stderr and exit with a nonzero status, making them straightforward to handle from scripts and agents:

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

Errors do not include the API key, authorization header, or a stack trace.

## Development

[Bun](https://bun.sh/) 1.3+ is used for development; npm users only need Node.js.

```bash
bun install --frozen-lockfile
bun run src/cli.ts --help
bun run dev -- games --year 2026 --team "Florida State"
bun run typecheck
bun test
bun run build:npm
bun run build:native
```

The default test suite is offline. Live smoke tests are opt-in, consume CFBD quota, and should only be run with explicit authorization.

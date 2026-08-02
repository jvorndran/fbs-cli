# FBS CLI

`fbs` is an agent-first, read-only command-line interface for the [CollegeFootballData](https://collegefootballdata.com/) REST API. Command paths mirror CFBD routes, flags mirror CFBD query parameters, and every successful response is deterministic YAML.

The pinned `cfbd` 5.21.0 client exposes 71 GET routes, and this CLI implements all 71. Betting-related data is historical and read-only: `fbs lines` retrieves provider lines and `fbs teams ats` retrieves team against-the-spread records.

```text
caller -> fbs command -> cfbd TypeScript client -> CFBD API -> transformer -> YAML
```

The CLI does not provide writes, custom pagination, caching, file export, raw JSON, interactive prompts, or an MCP server.

## Requirements

- [Node.js](https://nodejs.org/) >=22.12.0
- A CollegeFootballData API key

The published npm package is `@jvorndran/fbs-cli`, and it installs the `fbs` command on Windows, macOS, and Linux. [Bun](https://bun.sh/) 1.3 or newer is required only when developing, testing, or building the repository.

The generated API client is pinned exactly to `cfbd` 5.21.0. Upgrade it intentionally and re-run the query-builder, transformer, type, CLI, and route-coverage suites when its generated types change.

## Install and configure

Install the CLI globally from npm:

```bash
npm install --global @jvorndran/fbs-cli
```

This makes `fbs` available from your shell. You can also run a command without installing the package globally:

```bash
npx --package=@jvorndran/fbs-cli fbs --help
```

Create a `.env` file in the directory where you run the CLI, then add your key:

```env
CFBD_API_KEY=your_key_here
```

The CLI optionally loads `.env` from the current working directory. An existing environment value takes precedence and is never overwritten by the file. The key is sent as a Bearer token and is never included in normal output or errors. Do not commit `.env` or paste the key into commands, logs, issues, or agent prompts.

An API command without a key fails before making a request:

```yaml
error:
  code: missing_api_key
  message: CFBD_API_KEY is required.
  hint: Set CFBD_API_KEY in your environment or .env file.
```

## Run the CLI

Run the globally installed command from Windows, macOS, or Linux:

```bash
fbs --help
fbs games --year 2026 --team "Florida State"
```

Or use npm without a global install:

```bash
npx --package=@jvorndran/fbs-cli fbs games --year 2026 --team "Florida State"
```

When developing from this repository, install the locked dependencies and run the executable Node entry through Bun:

```bash
bun install --frozen-lockfile
bun run src/cli.ts --help
bun run dev -- games --year 2026 --team "Florida State"
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

## YAML contract

Success writes one YAML document to stdout and nothing to stderr:

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

Contract rules:

- `command` is the command path without the leading `fbs`.
- `endpoint` is the CFBD REST route.
- `query` includes only supplied fields.
- `count` is the number of top-level records.
- The final key is the endpoint-specific result key shown in the command tables.
- Output keys are snake_case; `null` and `undefined` are omitted.
- `0`, `false`, meaningful empty strings, meaningful empty arrays, provider IDs, and numeric precision are preserved.
- Team stat arrays become maps; player and play-stat nesting becomes explicit rows where appropriate; advanced dimensions remain nested.
- Historical lines preserve game context and provider-level pricing; ATS results preserve wins, losses, pushes, and average cover margin without creating betting advice.
- There is no format switch, surrounding prose, banner, spinner, logging, color, YAML anchor, or alias.
- Output ends with exactly one newline.

Failures write one YAML document to stderr, leave stdout empty, and exit nonzero:

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

Errors never include a stack trace, authorization header, or API key by default. Useful provider messages are preserved, and hints appear only for deterministic corrections.

## Develop, test, and build

```bash
# Run from source
bun run src/cli.ts --help

# Run through the development script
bun run dev -- games --year 2026 --team "Florida State"

# Type-check strict TypeScript
bun run typecheck

# Run the default offline/mocked suite
bun test

# Build the cross-platform Node.js npm entry
bun run build:npm

# Optionally compile a current-platform standalone executable
bun run build:native
```

Default tests must not call the live CFBD API. Live smoke tests are separate, consume quota, and require both explicit authorization and the opt-in flag:

```bash
CFBD_API_KEY=... CFBD_LIVE_TESTS=1 bun test tests/live
```

In PowerShell, set process-local variables instead. Never run the live suite merely because `CFBD_API_KEY` happens to exist. `build:npm` emits `dist/fbs.js`, which is the npm package entry and runs on Node.js >=22.12.0 across supported operating systems. The npm package allowlist publishes only that JavaScript entry. `build:native` optionally emits `dist/fbs` or the current-platform equivalent such as `dist/fbs.exe`.

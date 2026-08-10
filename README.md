# FBS CLI

[![npm version](https://img.shields.io/npm/v/%40jvorndran%2Ffbs-cli)](https://www.npmjs.com/package/@jvorndran/fbs-cli)
[![CI](https://github.com/jvorndran/fbs-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/jvorndran/fbs-cli/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-43853d)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

`fbs` is an unofficial, read-only command-line interface for the [CollegeFootballData](https://collegefootballdata.com/) API. It exposes all 71 GET routes from the pinned official `cfbd` 5.21.0 TypeScript client as predictable commands and returns deterministic YAML for terminals, scripts, and agent workflows.

```bash
$ fbs games --year 2024 --week 1 --team "Florida State"
command: games
endpoint: /games
query:
  year: 2024
  week: 1
  team: Florida State
count: 1
games:
  - season: 2024
    week: 1
    status: completed
    matchup: Boston College at Florida State
```

The response above is abridged. The real command preserves provider IDs, timestamps, scores, nested details, and numeric precision.

Why use it:

- Endpoint-shaped commands and provider terminology: no hidden aliases or generated analysis.
- Read-only access to schedules, teams, players, plays, metrics, recruiting, ratings, draft history, historical lines, and every other CFBD GET route.
- One YAML document on stdout for success and one machine-actionable YAML error on stderr for failure.
- No database, cache, pagination layer, file export, model execution, or decorative terminal UI.

## Quick start

You need [Node.js](https://nodejs.org/) >=22.12.0 and a [free CFBD API key](https://collegefootballdata.com/key).

### 1. Install the CLI

```bash
npm install --global @jvorndran/fbs-cli
```

This adds the `fbs` command on Windows, macOS, and Linux.

### 2. Configure your API key

Run the local credential setup from the directory where you will use `fbs`:

```bash
fbs auth
```

When run interactively, `fbs auth` first explains the validation and save steps, then asks for your CollegeFootballData API key at a masked prompt. It makes one authenticated `GET /info` request to verify the key, then writes `CFBD_API_KEY` to `.env` in the current directory. It preserves other entries and replaces an existing key instead of adding a duplicate. If validation fails, `.env` is not changed.

For manual or ephemeral setup, set `CFBD_API_KEY` in the shell environment or create this project-local file yourself:

```env
CFBD_API_KEY=your_key_here
```

### 3. Run a command

```bash
fbs --help
fbs games --year 2026 --team "Florida State"
```

Quote team and player names that contain spaces. Use `fbs <command path> --help` to see the flags accepted by any command.

### Run without installing

For occasional interactive use, `npx` can infer the package's `fbs` executable:

```bash
npx --yes @jvorndran/fbs-cli@latest --help
npx --yes @jvorndran/fbs-cli@latest auth
npx --yes @jvorndran/fbs-cli@latest games --year 2026 --team "Florida State"
```

`npx` itself may print installation notices on stderr before `fbs` starts. Install the package first when a script or agent requires the CLI's strict stdout/stderr contract.

## API key setup

`fbs` checks `CFBD_API_KEY` already set in your shell first, then `.env` in the current directory. `fbs auth` validates the entered key with one `/info` request before creating or updating that local `.env` file. The request consumes one CFBD API call. The CLI does not use a global credential folder or operating-system-specific storage. Request a key at [collegefootballdata.com/key](https://collegefootballdata.com/key).

Run `fbs auth` from each directory where you want a separate `.env`, or create the file manually. Manual setup skips the immediate validation request; the next data command will report any authentication problem. Because `.env` contains the key as plaintext, add it to `.gitignore` and never commit it or paste the key into commands, issues, logs, or agent prompts.

An API command without a key fails before making a request:

```yaml
error:
  code: missing_api_key
  message: CFBD_API_KEY is required.
  hint: Set CFBD_API_KEY or run fbs auth to create .env in the current directory.
```

Successful `auth` output reports which credential source will actually win on the next endpoint command:

```yaml
command: auth
status: saved
env_file: /project/.env
active_source: env_file
```

If `CFBD_API_KEY` is already nonblank in the process environment, `active_source` is `environment` and the result warns that the environment still takes precedence over the newly saved `.env`. Unset or replace that environment value when the saved key should become active.

Credential failures identify the corrective source: `invalid_api_key` tells you whether to replace the environment value or rerun `fbs auth` for `.env`; `env_file_read_failed` points to permissions; `env_file_invalid` points to syntax; and `unsafe_env_file` rejects a symlink or non-regular `.env` file.

## Agent use

The versioned agent guide at [`skills/fbs-cli/SKILL.md`](skills/fbs-cli/SKILL.md) covers command selection, multi-endpoint research flows, YAML parsing, deterministic error recovery, credential safety, and the CLI's read-only boundaries. It is included in the npm package so an installed artifact and its guide stay on the same release.

Installing the npm package does not automatically activate the guide in an agent host. Link or install that file using the host's normal skill mechanism. Never put a CFBD key in an agent prompt; configure it through the environment or the local masked `fbs auth` flow.

## Stability

Version 1 follows semantic versioning. Command paths, documented flags, result keys, structured envelopes, exit behavior, credential precedence, and the read-only side-effect boundary are public compatibility contracts. Minor releases may add provider routes, optional flags, accepted enum values, fields, or hints. See the complete [v1 compatibility policy](https://github.com/jvorndran/fbs-cli/blob/main/docs/compatibility.md).

## Command reference

The tables below list every executable endpoint command. All shown flags are accepted; flags are optional unless the rule says otherwise. Quote multiword values. Run `fbs <command path> --help` for descriptions, enum choices, and examples from the executable itself.

### Teams, account, and reference data

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs info` | `/info` -> `info` | None | No filters. |
| `fbs info usage` | `/info/usage` -> `usage` | `--api`, `--days`, `--limit` | Optional; `days` is 1-31 and `limit` is 1-50. |
| `fbs conferences` | `/conferences` -> `conferences` | None | No filters. |
| `fbs talent` | `/talent` -> `talent` | `--year` | Require `--year`. |
| `fbs venues` | `/venues` -> `venues` | `--city`, `--state`, `--dome`, `--grass` | Optional local filters. |
| `fbs records` | `/records` -> `records` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs calendar` | `/calendar` -> `calendar` | `--year` | Require `--year`. |
| `fbs scoreboard` | `/scoreboard` -> `scoreboard` | `--conference`, `--classification`, `--team`, `--status`, `--venue` | Optional; may require an eligible CFBD tier and includes embedded betting fields when supplied by CFBD. |
| `fbs teams` | `/teams` -> `teams` | `--conference`, `--year`, `--classification` | Optional. |
| `fbs teams fbs` | `/teams/fbs` -> `teams` | `--year`, `--conference` | Optional. |
| `fbs teams matchup` | `/teams/matchup` -> `matchup` | `--team1`, `--team2`, `--min-year`, `--max-year` | Require both teams; `min-year <= max-year`. |
| `fbs teams ats` | `/teams/ats` -> `team_ats` | `--year`, `--team`, `--conference` | Require `--year`; returns historical ATS records. |
| `fbs roster` | `/roster` -> `players` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--country`, `--jersey`, `--class-year` | Optional. |

### Games, box scores, and live data

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs games` | `/games` -> `games` | `--id`, `--year`, `--week`, `--team`, `--home`, `--away`, `--conference`, `--season-type`, `--classification`, `--competition`, `--round`, `--completed`, `--neutral-site`, `--conference-game`, `--venue` | Require `--id` or `--year`; `--round` requires `--competition cfp`. |
| `fbs games teams` | `/games/teams` -> `games` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification` | Require `--id`, or `--year` plus one of `--week`, `--team`, `--conference`. |
| `fbs games players` | `/games/players` -> `player_stats` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--category`, `--season-type`, `--classification` | Same ID-or-scoped-year rule as `games teams`. |
| `fbs games weather` | `/games/weather` -> `weather` | `--game-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--indoors`, `--weather-condition`, `--min-temperature`, `--max-temperature` | Require `--game-id` or `--year`; may require an eligible tier. |
| `fbs games media` | `/games/media` -> `media` | `--year`, `--week`, `--team`, `--conference`, `--media-type`, `--season-type`, `--classification` | Require `--year`. |
| `fbs lines` | `/lines` -> `lines` | `--game-id`, `--year`, `--week`, `--season-type`, `--team`, `--home`, `--away`, `--conference`, `--provider` | Require `--game-id` or `--year`; returns historical provider lines. |
| `fbs game box advanced` | `/game/box/advanced` -> `box_score` | `--id`, `--team`, `--player`, `--position` | Require `--id`; may require an eligible tier. |
| `fbs live plays` | `/live/plays` -> `live_game` | `--game-id`, `--team`, `--period`, `--play-type`, `--scoring`, `--success`, `--rush-pass`, `--garbage-time` | Require `--game-id`; may require an eligible tier. |

### Drives and plays

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs drives` | `/drives` -> `drives` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--season-type`, `--classification`, `--result`, `--scoring` | Require `--year`. |
| `fbs plays` | `/plays` -> `plays` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--play-type`, `--season-type`, `--classification`, `--period`, `--down`, `--scoring`, `--min-yards-gained`, `--max-yards-gained`, `--min-ppa`, `--max-ppa` | Require both `--year` and `--week`. |
| `fbs plays stats` | `/plays/stats` -> `play_stats` | `--game-id`, `--athlete-id`, `--stat-type-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--period`, `--down` | Optional; CFBD caps the response at 2,000 rows and the CLI does not page. |
| `fbs plays stats types` | `/plays/stats/types` -> `play_stat_types` | None | No filters. |
| `fbs plays types` | `/plays/types` -> `play_types` | None | No filters. |

### Team and player statistics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs stats game advanced` | `/stats/game/advanced` -> `advanced_game_stats` | `--year`, `--team`, `--week`, `--opponent`, `--season-type`, `--exclude-garbage-time`, `--game-id` | Require `--year` or `--team`. |
| `fbs stats game havoc` | `/stats/game/havoc` -> `game_havoc_stats` | `--year`, `--week`, `--team`, `--opponent`, `--season-type`, `--game-id` | Require `--year` or `--team`. |
| `fbs stats season` | `/stats/season` -> `team_stats` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--classification` | Require `--year` or `--team`; `start-week <= end-week`. |
| `fbs stats season advanced` | `/stats/season/advanced` -> `advanced_season_stats` | `--year`, `--team`, `--start-week`, `--end-week`, `--classification`, `--exclude-garbage-time` | Require `--year` or `--team`; `start-week <= end-week`. |
| `fbs stats player season` | `/stats/player/season` -> `player_season_stats` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--category`, `--season-type`, `--player`, `--stat-type` | Require `--year`; `start-week <= end-week`. |
| `fbs stats player success` | `/stats/player/success` -> `player_success_rates` | `--year`, `--player-id`, `--team`, `--conference`, `--start-week`, `--end-week`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--player` | Require `--year` or `--player-id`; `start-week <= end-week`. |
| `fbs stats player success game` | `/stats/player/success/game` -> `player_game_success_rates` | `--year`, `--week`, `--player-id`, `--team`, `--conference`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--player` | Require `--year` plus one of `--week`, `--team`, `--player-id`. |
| `fbs stats categories` | `/stats/categories` -> `categories` | None | No filters. |
| `fbs player usage` | `/player/usage` -> `player_usage` | `--year`, `--team`, `--conference`, `--player-id`, `--position`, `--exclude-garbage-time` | Require `--year`. |
| `fbs player search` | `/player/search` -> `players` | `--search-term`, `--year`, `--team`, `--position` | Require `--search-term`. |
| `fbs player season overview` | `/player/season/overview` -> `player_season_overview` | `--year`, `--player-id` | Require both flags. |
| `fbs player returning` | `/player/returning` -> `returning_production` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs player portal` | `/player/portal` -> `transfers` | `--year`, `--origin`, `--destination`, `--position`, `--eligibility`, `--min-rating`, `--min-stars`, `--from-date`, `--to-date` | Require `--year`. |

### PPA and probability metrics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs ppa predicted` | `/ppa/predicted` -> `predicted_points` | `--down`, `--distance` | Require both; down is 1-4 and distance is nonnegative. |
| `fbs ppa teams` | `/ppa/teams` -> `team_ppa` | `--year`, `--team`, `--conference`, `--classification`, `--exclude-garbage-time` | Require `--year` or `--team`. |
| `fbs ppa games` | `/ppa/games` -> `game_ppa` | `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--exclude-garbage-time`, `--game-id`, `--opponent` | Require `--year`. |
| `fbs ppa players games` | `/ppa/players/games` -> `player_game_ppa` | `--year`, `--week`, `--team`, `--position`, `--player-id`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--game-id`, `--player`, `--opponent` | Require `--year` plus `--week` or `--team`. |
| `fbs ppa players season` | `/ppa/players/season` -> `player_season_ppa` | `--year`, `--team`, `--conference`, `--position`, `--player-id`, `--threshold`, `--exclude-garbage-time`, `--player` | Require `--year` or `--player-id`. |
| `fbs metrics wp` | `/metrics/wp` -> `win_probability` | `--game-id`, `--period` | Require `--game-id`. |
| `fbs metrics wp pregame` | `/metrics/wp/pregame` -> `pregame_win_probabilities` | `--year`, `--week`, `--team`, `--season-type`, `--home`, `--away` | Optional. |
| `fbs metrics fg ep` | `/metrics/fg/ep` -> `field_goal_expected_points` | None | No filters. |

### Opponent-adjusted metrics

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs wepa team season` | `/wepa/team/season` -> `team_metrics` | `--year`, `--team`, `--conference` | Optional. |
| `fbs wepa players passing` | `/wepa/players/passing` -> `player_metrics` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays` | Optional. |
| `fbs wepa players rushing` | `/wepa/players/rushing` -> `player_metrics` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays` | Optional. |
| `fbs wepa players kicking` | `/wepa/players/kicking` -> `kicker_ratings` | `--year`, `--team`, `--conference`, `--player`, `--min-attempts` | Optional. |

### Recruiting, ratings, and rankings

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs recruiting players` | `/recruiting/players` -> `recruits` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--min-stars`, `--min-rating`, `--max-ranking` | Require `--year` or `--team`. |
| `fbs recruiting teams` | `/recruiting/teams` -> `team_rankings` | `--year`, `--team`, `--max-rank` | Optional. |
| `fbs recruiting groups` | `/recruiting/groups` -> `recruiting_groups` | `--conference`, `--start-year`, `--end-year`, `--recruit-type`, `--team`, `--position-group`, `--min-commits`, `--min-average-stars` | Optional; `start-year <= end-year`. |
| `fbs ratings sp` | `/ratings/sp` -> `sp_ratings` | `--year`, `--team` | Require `--year` or `--team`. |
| `fbs ratings sp conferences` | `/ratings/sp/conferences` -> `conference_sp_ratings` | `--year`, `--conference`, `--classification` | Optional. |
| `fbs ratings srs` | `/ratings/srs` -> `srs_ratings` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs ratings srs expanded` | `/ratings/srs/expanded` -> `expanded_srs_ratings` | `--year`, `--team`, `--conference`, `--classification` | Require `--year` or `--team`. |
| `fbs ratings elo` | `/ratings/elo` -> `elo_ratings` | `--year`, `--week`, `--team`, `--conference`, `--season-type` | Optional. |
| `fbs ratings fpi` | `/ratings/fpi` -> `fpi_ratings` | `--year`, `--team`, `--conference` | Require `--year` or `--team`. |
| `fbs rankings` | `/rankings` -> `rankings` | `--year`, `--week`, `--poll`, `--season-type`, `--latest`, `--final` | Require `--year`. |

For `fbs ratings sp`, supplying both `--year` and `--team` makes one full-year provider request and filters that response locally. This preserves CFBD's national overall, offense, and defense ranking fields instead of the rank-within-filter values returned by a team-filtered request. The YAML `query` still records both user-supplied filters, and `count` reflects the locally filtered result. A team-only query is forwarded unchanged because there is no bounded season comparison set.

### Playoffs, draft, and coaches

| Command | Endpoint -> result key | Accepted flags | Required rule |
|---|---|---|---|
| `fbs playoffs cfp` | `/playoffs/cfp` -> `playoff` | `--year` | Require `--year`. |
| `fbs playoffs cfp participants` | `/playoffs/cfp/participants` -> `participants` | `--year` | Require `--year`. |
| `fbs playoffs cfp games` | `/playoffs/cfp/games` -> `games` | `--year`, `--round` | Require `--year`. |
| `fbs draft teams` | `/draft/teams` -> `draft_teams` | None | No filters. |
| `fbs draft positions` | `/draft/positions` -> `draft_positions` | None | No filters. |
| `fbs draft picks` | `/draft/picks` -> `draft_picks` | `--year`, `--team`, `--school`, `--conference`, `--position`, `--round`, `--min-overall`, `--max-overall` | Optional. |
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

Kebab-case provider flags map directly to the corresponding CFBD camelCase query fields, such as `--game-id` -> `gameId`, `--player-id` -> `playerId`, `--season-type` -> `seasonType`, and `--exclude-garbage-time` -> `excludeGarbageTime`. Do not invent aliases.

### Local filters and output budget

Flags described as **Local filter** in executable help are applied after CFBD responds and after the endpoint transformer runs. They are never sent to CFBD: `query` remains the exact provider request and an additive `filters` object records the supplied local filter values. String matching is case-insensitive exact matching, numeric bounds are inclusive, and local boolean values must be `true` or `false`.

Every endpoint success document is limited to `25,000` Unicode code points by default, including its final newline. Configure `FBS_MAX_OUTPUT_CHARS` in the process environment first, then the current-directory `.env`; set it to a non-negative safe integer, or to `0` to explicitly disable the limit. `auth`, help, version output, and provider errors are unaffected.

When a rendered document is too large, stdout remains empty and stderr contains `output_too_large` with the request `query`, any applied `filters`, `output_characters`, and `max_output_characters`. Narrow the request or local filters, or intentionally raise `FBS_MAX_OUTPUT_CHARS`.

### Nested command parsing

Put endpoint filters after the complete command path, for example `fbs games teams --year 2026 --week 1`. A leaf inherits an explicitly supplied ancestor flag only when the leaf exposes that same flag. If the flag is supplied again after the full leaf path, the leaf value wins.

An ancestor flag unsupported by the selected leaf fails before any request with exit code 2 and `error.code: cli_parse_error`. The hint points to the exact leaf help and asks you to place filters after the full command path. This applies to executable parents with nested actions such as `teams`, `games`, `plays`, `stats season`, `stats player success`, `metrics wp`, `ratings sp`, `ratings srs`, `playoffs cfp`, and `coaches`.

All free-text query values are trimmed before validation and before the provider request. A whitespace-only name, conference, provider, category, search term, or other text filter is an `invalid_query` failure and makes no request.

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
  year: 2024
  week: 1
  team: Florida State
count: 1
games:
  - season: 2024
    week: 1
    season_type: regular
    status: completed
    matchup: Boston College at Florida State
```

This historical response is abridged. Keys are snake_case, unavailable values are omitted, and provider IDs and numeric precision are preserved. The final collection key matches the result key in the command tables above.

When local filters were supplied, the additive `filters` key appears between `query` and `count`; `count` then describes the filtered collection. It does not change the CFBD request recorded in `query`.

For `/games`, the raw `completed` boolean is preserved and the presentation `status` is exactly `completed` or `not_completed`. A false provider value cannot reliably distinguish a scheduled game from one in progress; use `fbs scoreboard` for richer current game status. For `/drives`, each `start` and `end` keeps the display `score: "O-D"` and also exposes numeric `offense_score` and `defense_score` fields.

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
`output_too_large` is a local exit-2 error and includes the rendered character count and configured cap; use its hint to reduce the response before retrying.
Exit code `0` means success, help/version output, or a quiet stdout `EPIPE`.
Exit code `2` identifies a locally correctable invocation, query, or credential
configuration error. Exit code `1` covers provider, network, filesystem, and
unexpected runtime failures.

Provider calls time out after 30 seconds without an automatic retry. That failure uses `network_timeout` and suggests trying again or narrowing a large query. If `/games/teams` categories would collide after snake-case normalization, the CLI emits `cfbd_invalid_response` instead of silently overwriting a stat; retry later or report the incompatible provider response shape.

When output is piped to a consumer that exits early, stdout `EPIPE` is treated as a quiet successful termination. Other stdout failures are not suppressed, and stderr behavior is unchanged.

## Development

[Bun](https://bun.sh/) 1.3+ is used for development; npm users only need Node.js.

```bash
bun install --frozen-lockfile
bun run src/cli.ts --help
bun run dev -- games --year 2026 --team "Florida State"
bun run typecheck
bun test
bun run test:coverage
bun run check:docs
bun run build:npm
bun run test:node
bun run test:pack
bun run build:native
```

The default test suite, documentation contract check, and packed-artifact smoke are offline. Live smoke tests are opt-in, consume CFBD quota, and should only be run with explicit authorization and a user-supplied key. See [CONTRIBUTING.md](https://github.com/jvorndran/fbs-cli/blob/main/CONTRIBUTING.md) for the development workflow and [docs/releasing.md](https://github.com/jvorndran/fbs-cli/blob/main/docs/releasing.md) for the maintainer-only release process.

## Project and support

- Report reproducible bugs through [GitHub Issues](https://github.com/jvorndran/fbs-cli/issues). Redact keys and authorization data.
- Report security problems privately as described in [SECURITY.md](https://github.com/jvorndran/fbs-cli/blob/main/SECURITY.md).
- Review compatibility guarantees in [docs/compatibility.md](https://github.com/jvorndran/fbs-cli/blob/main/docs/compatibility.md).
- See release history in [CHANGELOG.md](https://github.com/jvorndran/fbs-cli/blob/main/CHANGELOG.md).

## Acknowledgments

FBS CLI is an independent community project built on the [CollegeFootballData API](https://collegefootballdata.com/) and its official [`cfbd` TypeScript client](https://github.com/CFBD/cfbd-typescript). It is not affiliated with or endorsed by CollegeFootballData or Rad Sports Analytics. Data availability, quotas, and subscription tiers are controlled by the provider.

Bundled dependency licenses are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

FBS CLI is available under the [MIT License](LICENSE).

# FBS command filters

Use this reference to select a command and its accepted filters. Put filters after
the complete command path. Executable `fbs <complete leaf path> --help` remains
authoritative for validation rules, enum choices, and examples.

## Derived report exception

`fbs analyze team --year YEAR --team "TEAM"` accepts optional mutually exclusive
`--as-of` and `--before-game-id` cutoffs, plus `--season-type` and
`--classification`. It returns compact team, games, record, efficiency, drives,
PROE, player, and adjusted-rank analysis.

## Account, teams, and reference data

| Command | Filters |
|---|---|
| `fbs info` | None. |
| `fbs info usage` | `--api`, `--days`, `--limit` |
| `fbs conferences` | None. |
| `fbs talent` | `--year`, `--team`, `--min-talent`, `--max-talent` |
| `fbs venues` | `--city`, `--state`, `--dome`, `--grass`, `--min-capacity`, `--max-capacity` |
| `fbs records` | `--year`, `--team`, `--conference`, `--min-wins`, `--max-wins`, `--min-losses`, `--max-losses` |
| `fbs calendar` | `--year`, `--min-week`, `--max-week` |
| `fbs scoreboard` | `--conference`, `--classification`, `--team`, `--status`, `--venue` |
| `fbs teams` | `--conference`, `--year`, `--classification`, `--city`, `--state` |
| `fbs teams fbs` | `--year`, `--conference`, `--city`, `--state` |
| `fbs teams matchup` | `--team1`, `--team2`, `--min-year`, `--max-year` |
| `fbs teams ats` | `--year`, `--team`, `--conference` |
| `fbs roster` | `--year`, `--team`, `--classification`, `--name`, `--position`, `--state`, `--country`, `--jersey`, `--class-year`, `--min-height`, `--max-height`, `--min-weight`, `--max-weight` |

Roster `--name TEXT` searches the combined player name by a trimmed, case-insensitive literal substring. It composes with existing local filters, rejects blank searches before a request, and excludes unavailable names. The one `/roster` query, provider order, IDs, and precision are unchanged; `filters.name` and `count` describe the local result. Other string filters retain exact matching.

## Games, drives, and plays

| Command | Filters |
|---|---|
| `fbs games` | `--id`, `--year`, `--week`, `--team`, `--home`, `--away`, `--conference`, `--season-type`, `--classification`, `--competition`, `--round`, `--completed`, `--neutral-site`, `--conference-game`, `--venue` |
| `fbs games teams` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification` |
| `fbs games players` | `--id`, `--year`, `--week`, `--team`, `--conference`, `--category`, `--season-type`, `--classification` |
| `fbs games weather` | `--game-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--indoors`, `--weather-condition`, `--min-temperature`, `--max-temperature` |
| `fbs games media` | `--year`, `--week`, `--team`, `--conference`, `--media-type`, `--season-type`, `--classification` |
| `fbs lines` | `--game-id`, `--year`, `--week`, `--season-type`, `--team`, `--home`, `--away`, `--conference`, `--provider` |
| `fbs game box advanced` | `--id`, `--team`, `--player`, `--position` |
| `fbs live plays` | `--game-id`, `--team`, `--period`, `--play-type`, `--scoring`, `--success`, `--rush-pass`, `--garbage-time` |
| `fbs drives` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--season-type`, `--classification`, `--result`, `--scoring` |
| `fbs plays` | `--year`, `--week`, `--team`, `--offense`, `--defense`, `--conference`, `--offense-conference`, `--defense-conference`, `--play-type`, `--season-type`, `--classification`, `--period`, `--down`, `--scoring`, `--min-yards-gained`, `--max-yards-gained`, `--min-ppa`, `--max-ppa` |
| `fbs plays stats` | `--game-id`, `--athlete-id`, `--stat-type-id`, `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--period`, `--down` |
| `fbs plays stats types` | None. |
| `fbs plays types` | None. |

## Statistics, players, and metrics

| Command | Filters |
|---|---|
| `fbs stats game advanced` | `--year`, `--team`, `--week`, `--opponent`, `--season-type`, `--exclude-garbage-time`, `--game-id` |
| `fbs stats game havoc` | `--year`, `--week`, `--team`, `--opponent`, `--season-type`, `--game-id` |
| `fbs stats season` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--classification` |
| `fbs stats season advanced` | `--year`, `--team`, `--start-week`, `--end-week`, `--classification`, `--exclude-garbage-time` |
| `fbs stats player season` | `--year`, `--team`, `--conference`, `--start-week`, `--end-week`, `--category`, `--season-type`, `--player`, `--stat-type` |
| `fbs stats player success` | `--year`, `--player-id`, `--team`, `--conference`, `--start-week`, `--end-week`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--player` |
| `fbs stats player success game` | `--year`, `--week`, `--player-id`, `--team`, `--conference`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--player` |
| `fbs stats categories` | None. |
| `fbs player usage` | `--year`, `--team`, `--conference`, `--player-id`, `--position`, `--exclude-garbage-time` |
| `fbs player search` | `--search-term`, `--year`, `--team`, `--position` |
| `fbs player season overview` | `--year`, `--player-id` |
| `fbs player returning` | `--year`, `--team`, `--conference` |
| `fbs player portal` | `--year`, `--name`, `--origin`, `--destination`, `--position`, `--eligibility`, `--min-rating`, `--max-rating`, `--min-stars`, `--max-stars`, `--from-date`, `--to-date` |
| `fbs ppa predicted` | `--down`, `--distance` |
| `fbs ppa teams` | `--year`, `--team`, `--conference`, `--classification`, `--exclude-garbage-time` |
| `fbs ppa games` | `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--exclude-garbage-time`, `--game-id`, `--opponent` |
| `fbs ppa players games` | `--year`, `--week`, `--team`, `--position`, `--player-id`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--game-id`, `--player`, `--opponent` |
| `fbs ppa players season` | `--year`, `--team`, `--conference`, `--position`, `--player-id`, `--threshold`, `--exclude-garbage-time`, `--player` |
| `fbs metrics wp` | `--game-id`, `--period` |
| `fbs metrics wp pregame` | `--year`, `--week`, `--team`, `--season-type`, `--home`, `--away` |
| `fbs metrics fg ep` | None. |
| `fbs wepa team season` | `--year`, `--team`, `--conference` |
| `fbs wepa players passing` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays` |
| `fbs wepa players rushing` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays` |
| `fbs wepa players kicking` | `--year`, `--team`, `--conference`, `--player`, `--min-attempts` |

## Recruiting, ratings, playoffs, draft, and coaches

Recruiting players `--name TEXT` is a trimmed, case-insensitive literal substring search on provider names, applied locally after the single `/recruiting/players` request. It composes with star/rating/ranking ranges and provider scopes; blank text fails before a request, unavailable names do not match. `filters.name` and `count` describe the result; query, provider order, IDs, and precision stay unchanged.

| Command | Filters |
|---|---|
| `fbs recruiting players` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--name`, `--min-stars`, `--max-stars`, `--min-rating`, `--max-rating`, `--min-ranking`, `--max-ranking` |
| `fbs recruiting teams` | `--year`, `--team`, `--max-rank`, `--min-points`, `--max-points` |
| `fbs recruiting groups` | `--conference`, `--start-year`, `--end-year`, `--recruit-type`, `--team`, `--position-group`, `--min-commits`, `--max-commits`, `--min-average-stars`, `--max-average-stars` |
| `fbs ratings sp` | `--year`, `--team` |
| `fbs ratings sp conferences` | `--year`, `--conference`, `--classification` |
| `fbs ratings srs` | `--year`, `--team`, `--conference` |
| `fbs ratings srs expanded` | `--year`, `--team`, `--conference`, `--classification` |
| `fbs ratings elo` | `--year`, `--week`, `--team`, `--conference`, `--season-type` |
| `fbs ratings fpi` | `--year`, `--team`, `--conference` |
| `fbs rankings` | `--year`, `--week`, `--poll`, `--season-type`, `--latest`, `--final` |
| `fbs playoffs cfp` | `--year` |
| `fbs playoffs cfp participants` | `--year` |
| `fbs playoffs cfp games` | `--year`, `--round` |
| `fbs draft teams` | None. |
| `fbs draft positions` | None. |
| `fbs draft picks` | `--year`, `--team`, `--school`, `--conference`, `--position`, `--round`, `--min-overall`, `--max-overall` |
| `fbs coaches` | `--first-name`, `--last-name`, `--min-year`, `--max-year`, `--team`, `--year` |
| `fbs coaches profile` | `--coach-id` |
| `fbs coaches seasons` | `--coach-id`, `--min-year`, `--max-year`, `--team`, `--year` |
| `fbs coaches tenures` | `--active`, `--coach-id`, `--team`, `--year` |

Use `records --year 2026 --min-wins 5 --max-losses 1` to inspect season-record cohorts. `--min-wins`, `--max-wins`, `--min-losses`, and `--max-losses` are local inclusive bounds on `total.wins` and `total.losses`; split records remain unchanged. Bounds accept non-negative safe integers and each minimum must not exceed its maximum. Missing values are excluded only when that measurement is filtered. CFBD still receives only year/team/conference; `filters` records local values and `count` reflects matching rows. These are current/full-season records, not a cutoff-safe historical snapshot.

Portal `--name TEXT` searches combined first and last names with a trimmed, case-insensitive literal substring. Blank searches fail before a request; unavailable names do not match. It composes with all local filters without changing the year-only provider query, name fields, order, or precision; `filters.name` and `count` describe the result.

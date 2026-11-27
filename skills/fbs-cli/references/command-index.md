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
| `fbs venues` | `--name`, `--city`, `--state`, `--dome`, `--grass`, `--min-capacity`, `--max-capacity` |
| `fbs records` | `--year`, `--team`, `--conference`, `--min-wins`, `--max-wins`, `--min-losses`, `--max-losses` |
| `fbs calendar` | `--year`, `--min-week`, `--max-week` |
| `fbs scoreboard` | `--conference`, `--classification`, `--team`, `--status`, `--venue` |
| `fbs teams` | `--conference`, `--year`, `--name`, `--classification`, `--city`, `--state`, `--min-capacity`, `--max-capacity` |
| `fbs teams fbs` | `--year`, `--name`, `--conference`, `--city`, `--state`, `--min-capacity`, `--max-capacity` |
| `fbs teams matchup` | `--team1`, `--team2`, `--min-year`, `--max-year` |
| `fbs teams ats` | `--year`, `--team`, `--conference`, `--min-games`, `--max-games`, `--min-avg-cover-margin`, `--max-avg-cover-margin` |
| `fbs roster` | `--year`, `--team`, `--classification`, `--name`, `--position`, `--state`, `--country`, `--jersey`, `--class-year`, `--min-height`, `--max-height`, `--min-weight`, `--max-weight` |

Roster `--name TEXT` searches the combined player name by a trimmed, case-insensitive literal substring. It composes with existing local filters, rejects blank searches before a request, and excludes unavailable names. The one `/roster` query, provider order, IDs, and precision are unchanged; `filters.name` and `count` describe the local result. Other string filters retain exact matching.

For historical ATS cohorts, use `teams ats --year YEAR --min-games 10 --min-avg-cover-margin 0`. Games bounds accept non-negative safe integers; average-cover-margin bounds accept finite signed numbers. Bounds are inclusive and reject reversed ranges before a request. Missing values fail only an active bound. The provider query stays year/team/conference; order, IDs, and full precision are preserved. Read local bounds from `filters` and matches from `count`. These are full-season summaries, not cutoff-safe historical snapshots or betting recommendations.

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
| `fbs player usage` | `--year`, `--team`, `--conference`, `--player-id`, `--position`, `--exclude-garbage-time`, `--min-usage`, `--max-usage`, `--min-pass-usage`, `--max-pass-usage`, `--min-rush-usage`, `--max-rush-usage`, `--min-standard-downs-usage`, `--max-standard-downs-usage`, `--min-passing-downs-usage`, `--max-passing-downs-usage` |
| `fbs player search` | `--search-term`, `--year`, `--team`, `--position` |
| `fbs player season overview` | `--year`, `--player-id` |
| `fbs player returning` | `--year`, `--team`, `--conference`, `--min-usage`, `--max-usage`, `--min-passing-usage`, `--max-passing-usage`, `--min-rushing-usage`, `--max-rushing-usage`, `--min-total-ppa`, `--max-total-ppa`, `--min-total-passing-ppa`, `--max-total-passing-ppa`, `--min-total-receiving-ppa`, `--max-total-receiving-ppa`, `--min-total-rushing-ppa`, `--max-total-rushing-ppa` |
| `fbs player portal` | `--year`, `--name`, `--origin`, `--destination`, `--position`, `--eligibility`, `--min-rating`, `--max-rating`, `--min-stars`, `--max-stars`, `--from-date`, `--to-date` |
| `fbs ppa predicted` | `--down`, `--distance` |
| `fbs ppa teams` | `--year`, `--team`, `--conference`, `--classification`, `--exclude-garbage-time`, `--min-offense-ppa`, `--max-offense-ppa`, `--min-defense-ppa`, `--max-defense-ppa` |
| `fbs ppa games` | `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--classification`, `--exclude-garbage-time`, `--game-id`, `--opponent`, `--min-offense-ppa`, `--max-offense-ppa`, `--min-defense-ppa`, `--max-defense-ppa` |
| `fbs ppa players games` | `--year`, `--week`, `--team`, `--position`, `--player-id`, `--threshold`, `--season-type`, `--exclude-garbage-time`, `--game-id`, `--player`, `--opponent`, `--min-pass-ppa`, `--max-pass-ppa`, `--min-rush-ppa`, `--max-rush-ppa`, `--min-average-ppa`, `--max-average-ppa` |
| `fbs ppa players season` | `--year`, `--team`, `--conference`, `--position`, `--player-id`, `--threshold`, `--exclude-garbage-time`, `--player`, `--min-pass-ppa`, `--max-pass-ppa`, `--min-rush-ppa`, `--max-rush-ppa`, `--min-average-ppa`, `--max-average-ppa`, `--min-total-ppa`, `--max-total-ppa` |
| `fbs metrics wp` | `--game-id`, `--period` |
| `fbs metrics wp pregame` | `--year`, `--week`, `--team`, `--season-type`, `--home`, `--away`, `--min-home-win-probability`, `--max-home-win-probability` |
| `fbs metrics fg ep` | None. |
| `fbs wepa team season` | `--year`, `--team`, `--conference`, `--min-epa`, `--max-epa`, `--min-epa-allowed`, `--max-epa-allowed`, `--min-passing-epa`, `--max-passing-epa`, `--min-rushing-epa`, `--max-rushing-epa`, `--min-passing-epa-allowed`, `--max-passing-epa-allowed`, `--min-rushing-epa-allowed`, `--max-rushing-epa-allowed`, `--min-passing-downs-success-rate`, `--max-passing-downs-success-rate`, `--min-standard-downs-success-rate`, `--max-standard-downs-success-rate`, `--min-passing-downs-success-rate-allowed`, `--max-passing-downs-success-rate-allowed`, `--min-standard-downs-success-rate-allowed`, `--max-standard-downs-success-rate-allowed`, `--min-success-rate`, `--max-success-rate`, `--min-success-rate-allowed`, `--max-success-rate-allowed` |
| `fbs wepa players passing` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays`, `--min-wepa`, `--max-wepa` |
| `fbs wepa players rushing` | `--year`, `--team`, `--conference`, `--position`, `--player`, `--min-plays`, `--min-wepa`, `--max-wepa` |
| `fbs wepa players kicking` | `--year`, `--team`, `--conference`, `--player`, `--min-attempts`, `--min-paar`, `--max-paar` |

Use `wepa team season --year 2026 --max-passing-epa-allowed 0 --max-rushing-epa-allowed 0` to select teams by reported `epa_allowed.passing` and `epa_allowed.rushing`. Each split accepts inclusive finite signed `--min-`/`--max-` bounds. They combine with offensive splits, total EPA, success-rate bounds and provider scopes after one unchanged request. Missing split values fail only active bounds for that field. Reversed ranges fail before a request; provider order, IDs, zero and precision are preserved. Applied bounds appear in `filters`.

Use `wepa team season --year 2026 --min-passing-epa 0 --max-rushing-epa 0` to select teams by reported `epa.passing` and `epa.rushing`. Each split accepts inclusive finite signed `--min-`/`--max-` bounds. They combine with total EPA, success-rate bounds and provider scopes after the single unchanged request. Missing split values fail only active bounds for that field. Reversed ranges fail before a request; order, IDs, zero and full precision are preserved. Read applied bounds in `filters` and the match total in `count`.

Use `wepa team season --year 2026 --min-epa 0 --max-epa-allowed 0` to select teams by reported total EPA and total EPA allowed. The inclusive `--min-epa`/`--max-epa` bounds apply to `epa.total`; `--min-epa-allowed`/`--max-epa-allowed` apply to `epa_allowed.total`. Bounds accept finite signed numbers and reject reversed ranges before requesting data. They combine locally after the single year/team/conference query. Missing totals fail only an active bound for that field. Results preserve provider order and precision; `filters` records the bounds and `count` reports matches. These are full-season provider metrics; the CLI does not derive a net rating or pregame forecast.

For `wepa players passing` and `wepa players rushing`, use `--min-wepa` or `--max-wepa` to filter the reported weighted EPA. Bounds are inclusive and accept finite signed numbers. They compose with the player and play-count filters. Missing WEPA values are excluded when either bound is active.

For `wepa players kicking`, use `--min-paar` or `--max-paar` to filter the reported PAAR. Bounds are inclusive and accept finite signed numbers. They compose with `--player` and `--min-attempts`. Missing PAAR values are excluded when either bound is active.

## Recruiting, ratings, playoffs, draft, and coaches

Recruiting players `--name TEXT` is a trimmed, case-insensitive literal substring search on provider names, applied locally after the single `/recruiting/players` request. It composes with star/rating/ranking ranges and provider scopes; blank text fails before a request, unavailable names do not match. `filters.name` and `count` describe the result; query, provider order, IDs, and precision stay unchanged.

| Command | Filters |
|---|---|
| `fbs recruiting players` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--name`, `--min-stars`, `--max-stars`, `--min-rating`, `--max-rating`, `--min-ranking`, `--max-ranking`, `--min-height`, `--max-height`, `--min-weight`, `--max-weight` |
| `fbs recruiting teams` | `--year`, `--team`, `--max-rank`, `--min-points`, `--max-points` |
| `fbs recruiting groups` | `--conference`, `--start-year`, `--end-year`, `--recruit-type`, `--team`, `--position-group`, `--min-commits`, `--max-commits`, `--min-average-stars`, `--max-average-stars` |
| `fbs ratings sp` | `--year`, `--team`, `--min-rating`, `--max-rating`, `--min-offense-rating`, `--max-offense-rating`, `--min-defense-rating`, `--max-defense-rating`, `--min-special-teams-rating`, `--max-special-teams-rating` |
| `fbs ratings sp conferences` | `--year`, `--conference`, `--classification`, `--min-rating`, `--max-rating` |
| `fbs ratings srs` | `--year`, `--team`, `--conference`, `--min-rating`, `--max-rating` |
| `fbs ratings srs expanded` | `--year`, `--team`, `--conference`, `--min-rating`, `--max-rating`, `--classification` |
| `fbs ratings elo` | `--year`, `--week`, `--team`, `--conference`, `--season-type`, `--min-elo`, `--max-elo` |
| `fbs ratings fpi` | `--year`, `--team`, `--conference`, `--min-fpi`, `--max-fpi`, `--min-overall-efficiency`, `--max-overall-efficiency`, `--min-offense-efficiency`, `--max-offense-efficiency`, `--min-defense-efficiency`, `--max-defense-efficiency`, `--min-special-teams-efficiency`, `--max-special-teams-efficiency` |
| `fbs rankings` | `--year`, `--week`, `--poll`, `--season-type`, `--latest`, `--final` |
| `fbs playoffs cfp` | `--year` |
| `fbs playoffs cfp participants` | `--year` |
| `fbs playoffs cfp games` | `--year`, `--round` |
| `fbs draft teams` | None. |
| `fbs draft positions` | None. |
| `fbs draft picks` | `--name`, `--year`, `--team`, `--school`, `--conference`, `--position`, `--round`, `--min-overall`, `--max-overall` |
| `fbs coaches` | `--first-name`, `--last-name`, `--min-year`, `--max-year`, `--team`, `--year` |
| `fbs coaches profile` | `--coach-id` |
| `fbs coaches seasons` | `--coach-id`, `--min-year`, `--max-year`, `--team`, `--year`, `--min-wins`, `--max-wins`, `--min-losses`, `--max-losses` |
| `fbs coaches tenures` | `--active`, `--coach-id`, `--team`, `--year` |

Use `records --year 2026 --min-wins 5 --max-losses 1` to inspect season-record cohorts. `--min-wins`, `--max-wins`, `--min-losses`, and `--max-losses` are local inclusive bounds on `total.wins` and `total.losses`; split records remain unchanged. Bounds accept non-negative safe integers and each minimum must not exceed its maximum. Missing values are excluded only when that measurement is filtered. CFBD still receives only year/team/conference; `filters` records local values and `count` reflects matching rows. These are current/full-season records, not a cutoff-safe historical snapshot.

Portal `--name TEXT` searches combined first and last names with a trimmed, case-insensitive literal substring. Blank searches fail before a request; unavailable names do not match. It composes with all local filters without changing the year-only provider query, name fields, order, or precision; `filters.name` and `count` describe the result.

Use `fbs draft picks --year 2025 --name "smith"` to search provider player names by a trimmed, case-insensitive literal substring. Combine it with college or NFL team scopes, position, round, and overall-pick bounds. Blank searches fail before a request; unavailable names do not match. The provider query, name fields, order, IDs, and precision are unchanged; `filters.name` and `count` describe the local result.

Use `teams --name "state"` or `teams fbs --name "noles"` to discover teams by a trimmed, case-insensitive literal substring of any reported school, mascot, abbreviation, or alternate name. Combine the search with existing scopes and local filters. Blank searches fail before a request; unavailable labels do not match. The provider query, team order, IDs, and original labels stay unchanged; `filters.name` and `count` describe the result.

Use `venues --name "campbell"` to search provider venue names by a trimmed, case-insensitive literal substring. Combine it with city, state, dome, grass, or capacity filters. Blank searches fail before a request; unavailable names do not match. The single query-free `/venues` request, row order, IDs, and measurements remain unchanged. Read the applied search from `filters.name` and the matching total from `count`.

Use `ratings srs --year 2026 --min-rating 0 --max-rating 15` to select an inclusive cohort of provider SRS ratings; `ratings srs expanded` supports the same bounds plus its existing classification scope. Bounds accept finite signed numbers, reject reversed ranges before the single request, and preserve provider order, national rankings, and precision. A year or team is still required. Read the bounds from `filters` and the filtered total from `count`; local bounds never enter `query`.

Use `ratings fpi --year 2026 --min-fpi 0 --max-fpi 20` for inclusive local bounds on the reported top-level FPI rating. These finite signed bounds do not filter the nested FPI resume rank. A year or team remains required, and reversed ranges fail before a request. Missing ratings fail active bounds; provider order, nested metrics, and precision are retained. Bounds appear in `filters`, never the single provider `query`, and `count` reflects the filtered result.

Conference SP+ cohorts: `ratings sp conferences` accepts inclusive finite `--min-rating`/`--max-rating` bounds, including zero and negatives. Bounds stay local, compose with year/conference/classification, reject reversed ranges before requesting, and preserve provider order and precision. Read applied bounds from `filters` and the matching total from `count`.

Use `fbs player usage --year 2026 --min-usage 0.5` for an overall usage-share cohort. `--min-usage`/`--max-usage` are inclusive finite bounds from 0 to 1 on `usage.overall`, not snap counts or percentages. Invalid or reversed ranges fail before a request. Missing overall shares fail active bounds; zero is valid. Bounds compose with the provider options but stay out of the single provider query. Shares, IDs, order and precision are unchanged; `filters` records the bounds and `count` reflects matches.

For returning passing and rushing usage, add `--min-passing-usage`/`--max-passing-usage` on `passing_usage` and `--min-rushing-usage`/`--max-rushing-usage` on `rushing_usage`. For example, `fbs player returning --year 2026 --max-passing-usage 0.2 --min-rushing-usage 0.7` selects teams with low returning passing usage and high returning rushing usage. These inclusive finite 0-to-1 bounds combine with overall usage and the existing provider scopes. Missing split values fail only active bounds for that field; zero, precision and provider order are preserved. Reversed ranges fail before the single unchanged request. Read applied bounds in `filters` and the filtered total in `count`.

Use `fbs player returning --year 2026 --min-usage 0.5` to select teams by their returning usage share. Inclusive `--min-usage`/`--max-usage` bounds accept finite values from 0 to 1 and apply to the top-level `usage`, not retained PPA or snaps. Missing usage fails an active bound; zero is valid. Bounds stay out of the single provider query and preserve row order, precision and all returned metrics. `filters` records the bounds and `count` reflects matches. Invalid or reversed bounds fail before a request; `--year` or `--team` is still required.

Use `fbs metrics wp pregame --year 2026 --min-home-win-probability 0.4 --max-home-win-probability 0.6` to select a home-probability cohort. Both bounds are inclusive finite shares from 0 to 1 on the provider's `homeWinProbability`. They compose with local home/away filters and optional provider scopes. Missing probabilities fail active bounds; zero is valid. No probability is calculated or inverted for the requested team. Bounds stay out of the single provider query; `filters` records them and `count` reflects matches. Provider spreads, precision and row order are unchanged. Invalid or reversed bounds fail before a request.

Use `fbs ppa players season --year 2026 --threshold 50 --min-average-ppa 0 --min-total-ppa 10` to select player PPA cohorts. `--min-average-ppa`/`--max-average-ppa` filter `average_ppa.all`; `--min-total-ppa`/`--max-total-ppa` filter `total_ppa.all`. Both pairs accept inclusive finite signed bounds and reject reversed ranges before a request. Missing all-play values fail only an active bound; zero is valid. Combine bounds with the existing player, team, position, and play-count scopes. The single provider query, splits, IDs, row order, and precision stay unchanged. Read applied bounds from `filters` and the matching total from `count`; `--year` or `--player-id` is still required. These are full-season provider values, not a cutoff-safe snapshot.

Use `fbs ppa teams --year 2026 --min-offense-ppa 0` to select PPA cohorts. The paired minimum and maximum bounds are inclusive finite signed numbers on `offense.overall` and `defense.overall`. Missing measurements fail only an active bound; zero is valid. Bounds compose with existing scopes, stay out of the single provider query, and preserve IDs, splits, row order and precision. `filters` records the bounds and `count` reflects matches. Reversed ranges fail before a request; existing required provider scopes still apply.

Use `fbs ppa games --year 2026 --min-offense-ppa 0` to select PPA cohorts. The paired minimum and maximum bounds are inclusive finite signed numbers on `offense.overall` and `defense.overall`. Missing measurements fail only an active bound; zero is valid. Bounds compose with existing scopes, stay out of the single provider query, and preserve IDs, splits, row order and precision. `filters` records the bounds and `count` reflects matches. Reversed ranges fail before a request; existing required provider scopes still apply.

Use `fbs ppa players games --year 2026 --week 0 --min-average-ppa 0` to select PPA cohorts. The paired minimum and maximum bounds are inclusive finite signed numbers on `average_ppa.all`. Missing measurements fail only an active bound; zero is valid. Bounds compose with existing scopes, stay out of the single provider query, and preserve IDs, splits, row order and precision. `filters` records the bounds and `count` reflects matches. Reversed ranges fail before a request; existing required provider scopes still apply.

Use `ratings sp --year YEAR --min-offense-rating N --max-offense-rating N` or `--min-defense-rating N --max-defense-rating N` to select cohorts by the reported unit ratings. Bounds are inclusive finite signed numbers on `offense.rating` and `defense.rating`; smaller defense ratings are not inverted. They combine with overall rating bounds and team selection, preserving the single provider request, national ranks, precision, and row order. Reversed ranges fail before fetching; missing unit ratings fail only their active bounds. Local values appear in `filters`, never `query`, and `count` reflects matches.

Use `fbs player usage --year 2026 --min-pass-usage 0.5 --max-rush-usage 0.3` to select players by the reported `usage.pass` and `usage.rush` shares. Each split accepts inclusive finite `--min-`/`--max-` bounds from 0 to 1. They combine with overall usage bounds and provider scopes. Missing split values fail only active split bounds; zero is valid. Invalid or reversed bounds fail before a request. The CLI still makes one unchanged provider query and preserves IDs, order, precision, and all returned metrics. These are usage shares, not snap counts or target shares.

Use `fbs ppa players games --year 2026 --week 0 --min-pass-ppa 0 --max-rush-ppa 0.5` to filter reported average passing and rushing PPA. The paired `--min-pass-ppa`/`--max-pass-ppa` and `--min-rush-ppa`/`--max-rush-ppa` bounds are inclusive finite signed numbers on `average_ppa.pass` and `average_ppa.rush`. Missing splits fail only an active bound, and zero is valid. Reversed ranges fail before the single request. Bounds compose with existing local filters and provider scopes, appear in `filters`, and stay out of the provider query. Row order, IDs, precision, and scope requirements remain unchanged.

Use `fbs ppa players season --year 2026 --min-pass-ppa 0 --max-rush-ppa 0.5` to filter reported average passing and rushing PPA. The paired `--min-pass-ppa`/`--max-pass-ppa` and `--min-rush-ppa`/`--max-rush-ppa` bounds are inclusive finite signed numbers on `average_ppa.pass` and `average_ppa.rush`. Missing splits fail only an active bound, and zero is valid. Reversed ranges fail before the single request. Bounds compose with existing local filters and provider scopes, appear in `filters`, and stay out of the provider query. Row order, IDs, precision, and scope requirements remain unchanged.

`player usage` also accepts local `--min-standard-downs-usage`, `--max-standard-downs-usage`, `--min-passing-downs-usage` and `--max-passing-downs-usage` bounds on reported `usage.standard_downs` and `usage.passing_downs`. Bounds are finite, inclusive shares from 0 to 1 and compose with overall/passing/rushing usage and provider scopes. Missing situational values fail an active bound; omitted bounds preserve the full result. Filters appear separately from the unchanged provider query, and `count` reflects the selected rows. These situational shares do not identify play types.

Use `fbs wepa team season --year 2026 --min-success-rate 0.4 --max-success-rate-allowed 0.4` to select teams by reported total success rate and success rate allowed. The inclusive `--min-success-rate`/`--max-success-rate` bounds apply to `success_rate.total`; `--min-success-rate-allowed`/`--max-success-rate-allowed` apply to `success_rate_allowed.total`. Bounds must be finite shares from 0 to 1; invalid or reversed ranges fail before a request. They compose with total EPA bounds and provider year/team/conference scopes after the single GET. Missing totals fail only an active bound on that field. Provider order, IDs and precision remain unchanged; `filters` records the bounds and `count` reports matches.

Use `coaches seasons --year YEAR --min-wins 10 --max-losses 2` to inspect coach-season records with inclusive win/loss bounds. `--min-wins`, `--max-wins`, `--min-losses` and `--max-losses` accept non-negative safe integers; reversed ranges fail before a request. These local filters combine with the existing provider scopes without entering the single `/coaches/seasons` query. Missing measurements fail only a bound for that field; zero records, IDs, ties, precision and provider order are preserved. Read the applied bounds in `filters` and the filtered total in `count`.

Use `wepa team season` with `--min-passing-downs-success-rate`/`--max-passing-downs-success-rate` and `--min-standard-downs-success-rate`/`--max-standard-downs-success-rate` to filter offensive splits. Append `-allowed` to each flag for defensive splits. These inclusive local bounds accept finite numbers from 0 to 1 and compose with total success-rate, EPA and provider filters. Missing split values fail only an active bound. Reversed or invalid bounds fail before a request. Provider query fields, row order and numerical precision stay unchanged; `filters` records the bounds and `count` reflects matching teams.

Use `ratings fpi --year 2026 --min-offense-efficiency 80 --max-defense-efficiency 60` to filter reported unit efficiencies. Each of `overall`, `offense`, `defense` and `special-teams` supports inclusive `--min-<unit>-efficiency`/`--max-<unit>-efficiency` bounds from 0 to 100. These apply to the corresponding nested `efficiencies` values and combine with top-level FPI bounds and provider scopes after one unchanged request. Missing values fail only an active bound for that unit. Invalid or reversed ranges fail before a request. Provider order, zero and precision are preserved; `filters` records the bounds and `count` reports matches.

Use `ratings sp --year 2026 --min-special-teams-rating 0` for special-teams SP+ cohorts. `--min-special-teams-rating` and `--max-special-teams-rating` are inclusive finite signed bounds on `special_teams.rating`. They compose with overall, offense and defense bounds and team selection. Missing values fail an active bound; reversed ranges fail before fetching. The single provider request, national rankings, row order and precision stay unchanged. Applied bounds appear in `filters`, with matches in `count`.

Use `fbs player returning --year 2026 --min-total-ppa 0 --max-total-passing-ppa 10` to select teams by reported returning PPA totals. Inclusive `--min-total-ppa`/`--max-total-ppa`, `--min-total-passing-ppa`/`--max-total-passing-ppa`, `--min-total-receiving-ppa`/`--max-total-receiving-ppa` and `--min-total-rushing-ppa`/`--max-total-rushing-ppa` apply to `total_ppa`, `total_passing_ppa`, `total_receiving_ppa` and `total_rushing_ppa`. Bounds accept finite signed numbers and combine with usage bounds and year, team or conference scopes. These are provider totals, not PPA shares or per-play averages. Missing values fail only active bounds; zero, precision and provider order remain intact. Bounds appear in `filters`, never in the single provider query; `count` reflects matches. Reversed ranges fail before a request, and year or team remains required.

Use `fbs recruiting players --year 2026 --position LB --min-height 72 --min-weight 200` to select recruits by provider-reported height and weight. Inclusive `--min-height`/`--max-height` and `--min-weight`/`--max-weight` accept finite non-negative numbers in the provider's original units, with no conversion or rounding. They combine with name, star, rating and ranking filters and provider scopes. Missing height or weight fails only an active bound on that field; zero and provider order are preserved. Bounds appear in `filters`, never in the single `/recruiting/players` query, and `count` reflects matches. Reversed ranges fail before a request; year or team remains required.

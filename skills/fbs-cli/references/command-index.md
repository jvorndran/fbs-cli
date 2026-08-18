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
| `fbs talent` | `--year` |
| `fbs venues` | `--city`, `--state`, `--dome`, `--grass` |
| `fbs records` | `--year`, `--team`, `--conference` |
| `fbs calendar` | `--year` |
| `fbs scoreboard` | `--conference`, `--classification`, `--team`, `--status`, `--venue` |
| `fbs teams` | `--conference`, `--year`, `--classification` |
| `fbs teams fbs` | `--year`, `--conference` |
| `fbs teams matchup` | `--team1`, `--team2`, `--min-year`, `--max-year` |
| `fbs teams ats` | `--year`, `--team`, `--conference` |
| `fbs roster` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--country`, `--jersey`, `--class-year` |

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
| `fbs player portal` | `--year`, `--origin`, `--destination`, `--position`, `--eligibility`, `--min-rating`, `--min-stars`, `--from-date`, `--to-date` |
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

| Command | Filters |
|---|---|
| `fbs recruiting players` | `--year`, `--team`, `--classification`, `--position`, `--state`, `--min-stars`, `--min-rating`, `--max-ranking` |
| `fbs recruiting teams` | `--year`, `--team`, `--max-rank` |
| `fbs recruiting groups` | `--conference`, `--start-year`, `--end-year`, `--recruit-type`, `--team`, `--position-group`, `--min-commits`, `--min-average-stars` |
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

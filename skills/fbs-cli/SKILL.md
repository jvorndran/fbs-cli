---
name: fbs-cli
description: Query CollegeFootballData through the read-only FBS CLI. Use for CLI setup, command or filter selection, schedules, rosters, games, box scores, plays, team or player statistics, historical lines and ATS, ratings, recruiting, transfers, coaches, live data, YAML parsing, error recovery, and any team or matchup analysis. Always start team analysis with `fbs analyze team`.
---

# FBS CLI

Use `fbs` as a thin retrieval layer for all 71 GET routes in the pinned `cfbd` 5.21.0 client. `fbs analyze team` is the one explicit derived-report exception. Both surfaces return deterministic YAML.

## Start here

1. Prefer user-supplied structured data. Query CFBD only for a specific unresolved question.
2. Set `CFBD_API_KEY` in the environment or current-directory `.env`; the environment wins. Run `fbs auth` to create or update `.env`. Never ask the user to paste a key into chat.
3. Run `fbs <complete leaf path> --help` before guessing a flag. If the leaf command is unclear, read [command-index.md](references/command-index.md).
4. Set the research `as_of` and cutoff, issue the smallest useful query, and reuse returned game, player, coach, drive, and play IDs.
5. Parse stdout only on exit `0`. Record the exact invocation and returned envelope. On failure, parse the structured stderr error and keep stdout empty.

## Choose the smallest flow

For any request that analyzes a team or matchup—including pregame, postgame, strengths, weaknesses, efficiency, or trends—start with `fbs analyze team` for every team in scope. Use raw endpoint commands only for details the report does not provide.

| Need | Start | Add only when it answers a distinct question |
|---|---|---|
| Week or slate | `fbs games --year Y --week W --season-type regular` | `calendar` only to resolve the week; `games media` for broadcast; `scoreboard` for richer current status. |
| One game | `fbs games --id ID` | `games teams`, `games players`, then targeted advanced box, drives, plays, or win probability. |
| Fresh team profile | `fbs analyze team --year Y --team "TEAM"` | Add `--before-game-id ID` for a reproducible pregame view; use raw endpoint commands only for a question the report does not answer. |
| Team matchup | Run cutoff-matched `analyze team` reports for both teams | Roster/continuity or game-level detail only when it adds a unique dimension. |
| Player | `player search` or `roster`, then reuse `player_id` | Bounded player season/success or game rows; play associations only for a stated role question. |
| Historical market | `fbs lines --game-id ID` | `teams ats` for descriptive context; obtain live price, quote time, and rules elsewhere. |
| Reproduction or audit | Rerun the recorded exact command | Compare the envelope, IDs, cutoff, preserved boundary values, and structured errors. |

Stop when another endpoint would only repeat a CFBD-derived dimension. Several FBS commands are complementary views of the same upstream games and plays, not independent corroboration.

## Protect the cutoff and semantics

- Include only games completed before the target kickoff. Record their IDs; do not trust `end-week: N-1` until the schedule proves it matches that set.
- Use week-bounded season/player endpoints for historical pregame aggregates. Reconstruct from eligible game rows when Week 0, postponements, or rescheduling break the week boundary.
- Treat team PPA, WEPA, SP/SRS/FPI, records, player usage, player season overview, and returning production as current/full-season views unless an archived snapshot establishes the historical state.
- `player returning` reports retained PPA and usage, not returning snaps. `player usage` reports usage shares, not snaps, routes, depth charts, or availability.
- Scope `plays stats` narrowly; CFBD caps it at 2,000 rows and the CLI does not page.
- Preserve tier, authorization, timeout, rate, and provider failures as errors. Never convert them into an empty collection.
- Treat `lines`, ATS, and scoreboard betting fields as historical read-only context. They do not establish a current executable quote, attached spread/total price, provider observation time, or settlement rules.

## Read the YAML correctly

Success is one YAML document on stdout:

```yaml
command: games
endpoint: /games
query:
  year: 2026
count: 1
games: []
```

- Verify `command`, `endpoint`, supplied `query`, `count`, and the endpoint-specific final key.
- Preserve `0`, `false`, IDs, arrays, and numeric precision. Omitted provider fields remain unknown.
- Treat `count: 0` with the correct empty final collection as a successful no-row response, not proof of numeric zero or confirmed absence.
- For every material call, retain CLI version, exact command, exit code, retrieval time, applicable cutoff, included IDs, result key, CFBD lineage, and any structured error.

### Team analysis command

Run:

```bash
fbs analyze team --year YEAR --team "TEAM"
```

This command builds a fresh, cutoff-safe report using only completed games before the effective cutoff. Use `--before-game-id ID` for a reproducible pregame view or `--as-of RFC3339` for an explicit time. Run it once for each team in a matchup.

The compact YAML output contains team and season context, the effective cutoff, scheduled and included games, record and game IDs, offense and defense-allowed efficiency, passing and rushing splits, havoc, drives, PROE, selected player workload and trends, and opponent-adjusted ranks. It may also contain `warnings` and `analysis.unavailable_metrics` when provider data is incomplete. If no completed games qualify, expect `analysis_no_completed_games` on stderr.

Failures are one `error` document on stderr with a nonzero exit. A 25,000-code-point default output cap reports `output_too_large` without stdout; narrow the command or set `FBS_MAX_OUTPUT_CHARS` to a larger non-negative safe integer (`0` disables the cap). Apply a deterministic `hint` when present; do not repeatedly retry broad queries.

## Boundaries

- Endpoint commands are read-only and consume CFBD quota. `fbs auth` is the only interactive or local-write command.
- Do not expect writes, custom pagination, caching, file export, output-format switches, model execution, or analysis beyond the explicit `analyze team` contract.
- Never run the live smoke-test suite during research.

## Load details only when needed

- [command-index.md](references/command-index.md): all 71 commands and their accepted filters.

FBS CLI is an independent community project built on CollegeFootballData and its official `cfbd` client. It is not affiliated with or endorsed by CollegeFootballData or Rad Sports Analytics.

## Local measurement filters

Recruiting team points and group commit/average-star cohort bounds are documented in [command-index.md](references/command-index.md); bounds are inclusive, local, and reject reversed ranges before requesting data. For record win/loss cohort bounds and roster name substring search, see [command-index.md](references/command-index.md). Use `roster --min-height N --max-height N` for inclusive height bounds in inches and `--min-weight N --max-weight N` for inclusive weight bounds in pounds. Values must be non-negative safe integers, and a minimum cannot exceed its maximum. These are local filters applied after the one `/roster` request; combine them with position or class-year filters. Missing measurements do not match an active bound. Read the applied values from `filters`, the unchanged provider request from `query`, and the filtered record count from `count`.

Use `venues --min-capacity N --max-capacity N` for inclusive seating capacity bounds, optionally combined with city, state, dome, or grass filters. Bounds must be non-negative safe integers with minimum no greater than maximum. An active capacity filter excludes unavailable capacity but preserves a reported zero. The single `/venues` request still has no query parameters; `filters` and `count` describe the local result.

## Talent cohorts

Use `talent --year YEAR --min-talent N --max-talent N` for an inclusive cohort of provider talent composite scores, optionally with an exact case-insensitive `--team` filter. Bounds accept finite numbers and reject reversed ranges before requesting data. Only `year` enters the single `/talent` query. Local `filters` and `count` describe the result without sorting, rounding, or deriving rankings; unfiltered output is unchanged. Talent is a season-level provider view, not a historical pregame snapshot.

Use `calendar --year YEAR --min-week N --max-week N` for inclusive week-number bounds, including Week 0. Bounds must be non-negative safe integers and reject reversed ranges before the one year-only `/calendar` request. Matching week numbers from all season types remain in provider order; `filters` and `count` describe the local result. Omitting bounds retains the full calendar.

Use `teams --state FL --city Tallahassee` or `teams fbs --year YEAR --state FL` to filter provider-reported venue geography locally. City/state match trimmed exact strings case-insensitively and combine with existing filters, without changing the single provider query. Missing fields fail only active geography filters; order/precision remain unchanged. Read `filters` and filtered `count`; blank values fail before requests. Venue location is not a recruiting or hometown filter.

## Recruiting player ranges

Use `recruiting players --year YEAR` or `--team TEAM` with `--min-stars`/`--max-stars`, `--min-rating`/`--max-rating`, and `--min-ranking`/`--max-ranking` to inspect a bounded cohort. Add `--name TEXT` for trimmed, case-insensitive literal name substring search; see [command-index.md](references/command-index.md). Blank searches fail before a request; unavailable names do not match. Bounds are inclusive; ranking means numerical national rank (100 through 500 includes ranks 100 and 500). Star and ranking values must be non-negative safe integers; ratings accept finite numbers with full precision. Reject reversed ranges before a request. These local filters never enter the CFBD query, exclude unavailable values only for the filtered fields, and preserve provider ordering. Read the applied filters in `filters` and the filtered record total in `count`.


## Transfer portal ranges

Use `player portal --year YEAR` with `--min-rating`/`--max-rating` and `--min-stars`/`--max-stars` for inclusive transfer cohorts. Ratings accept finite numbers without rounding; star bounds require non-negative safe integers. Reversed ranges fail before a request. These local bounds compose with origin, destination, position, eligibility and transfer dates; only `year` enters the single `/player/portal` request. Missing ratings or stars fail only an active bound for that field, reported zero values remain usable, and provider order is preserved. Read the bounds from `filters` and the filtered total from `count`; omitting bounds preserves existing output.

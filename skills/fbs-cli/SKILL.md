---
name: fbs-cli
description: Query CollegeFootballData through the read-only FBS CLI. Use for CLI setup, command or filter selection, schedules, rosters, games, box scores, plays, team or player statistics, historical lines and ATS, ratings, recruiting, transfers, coaches, live data, multi-endpoint retrieval, YAML parsing, and error recovery.
---

# FBS CLI

Use `fbs` as a thin retrieval layer. It mirrors all 71 GET routes in the pinned `cfbd` 5.21.0 client and returns deterministic YAML; perform analysis after retrieval.

## Start here

1. Prefer user-supplied structured data. Query CFBD only for a specific unresolved question.
2. Set `CFBD_API_KEY` in the environment or current-directory `.env`; the environment wins. Run `fbs auth` to create or update `.env`. Never ask the user to paste a key into chat.
3. Run `fbs <complete leaf path> --help` before guessing a flag. If the leaf command is unclear, read [command-index.md](references/command-index.md).
4. Set the research `as_of` and cutoff, issue the smallest useful query, and reuse returned game, player, coach, drive, and play IDs.
5. Parse stdout only on exit `0`. Record the exact invocation and returned envelope. On failure, parse the structured stderr error and keep stdout empty.

## Choose the smallest flow

| Need | Start | Add only when it answers a distinct question |
|---|---|---|
| Week or slate | `fbs games --year Y --week W --season-type regular` | `calendar` only to resolve the week; `games media` for broadcast; `scoreboard` for richer current status. |
| One game | `fbs games --id ID` | `games teams`, `games players`, then targeted advanced box, drives, plays, or win probability. |
| Team matchup | Bounded `stats season advanced` after resolving both teams | Roster/continuity, game-level detail, then one opponent-adjusted or rating view if it adds a unique dimension. |
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

Failures are one `error` document on stderr with a nonzero exit. A 25,000-code-point default output cap reports `output_too_large` without stdout; narrow the command or set `FBS_MAX_OUTPUT_CHARS` to a larger non-negative safe integer (`0` disables the cap). Apply a deterministic `hint` when present; do not repeatedly retry broad queries.

## Boundaries

- Endpoint commands are read-only and consume CFBD quota. `fbs auth` is the only interactive or local-write command.
- Do not expect writes, custom pagination, caching, file export, output-format switches, model execution, or hidden analysis.
- Never run the live smoke-test suite during research.

## Load details only when needed

- [command-index.md](references/command-index.md): all 71 commands and their accepted filters.

FBS CLI is an independent community project built on CollegeFootballData and its official `cfbd` client. It is not affiliated with or endorsed by CollegeFootballData or Rad Sports Analytics.

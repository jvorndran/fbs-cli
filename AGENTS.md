# Repository instructions

## Product contract

This repository implements `fbs`, an agent-first, read-only Node.js and TypeScript CLI over the CollegeFootballData REST API. It is published to npm as `@jvorndran/fbs-cli`. Keep the integration thin:

```text
Commander options -> pure query builder -> Zod validation -> cfbd client -> endpoint transformer -> YAML
```

Commands mirror CFBD endpoint paths and flags mirror CFBD query parameters. Do not introduce domain-specific aliases when the provider term is already clear.

The product scope explicitly excludes endpoint writes, MCP, databases, caches, RAG, custom pagination, output-format switches, file export, model execution, spinners, and decorative terminal UI. `fbs auth` is the sole local-write and interactive-prompt exception: it collects a key at a masked prompt, validates it with one `GET /info` request, and creates or updates `.env` in the current working directory. No other command may prompt or write locally. Betting fields, provider lines, and ATS records are supported as historical read-only data.

## Toolchain

- Installed runtime: Node.js >=22.12.0
- Development package manager, test runner, bundler, and compiler: Bun 1.3+
- npm package: `@jvorndran/fbs-cli`; installed command: `fbs`
- Language: strict TypeScript
- CLI: Commander
- API client: official `cfbd` package, pinned exactly to 5.21.0
- Runtime validation: Zod
- Serialization: `yaml`
- Tests: `bun:test`

Use the lockfile. Do not loosen or update pinned dependencies incidentally. For library, framework, API, SDK, CLI, or cloud-service guidance, follow the workspace's Context7 instructions before changing version-sensitive code.

Common commands:

```bash
bun install --frozen-lockfile
bun run src/cli.ts --help
bun run dev -- games --year 2026 --team "Florida State"
bun run typecheck
bun test
bun run build:npm
bun run build:native
```

`build:npm` emits the cross-platform Node entry at `dist/fbs.js`, and the npm package allowlist publishes only that file. `build:native` is optional and compiles a standalone executable for the current platform.

The default test suite must remain offline. Live smoke tests are opt-in only:

```bash
CFBD_LIVE_TESTS=1 bun test tests/live
```

Do not run live tests without explicit authorization and a user-provided `CFBD_API_KEY`. Never commit, log, echo, or otherwise expose that key.

## Command surface

The pinned `cfbd` 5.21.0 client exposes 71 GET routes. Keep all 71 endpoint commands stable.

`fbs auth` is a local credential-setup command, not a CFBD endpoint and not part of the 71-route count.

Executable endpoint commands, grouped by domain:

- Account/reference: `info`, `info usage`, `conferences`, `talent`, `venues`, `records`, `calendar`, `scoreboard`.
- Teams/rosters: `teams`, `teams fbs`, `teams matchup`, `teams ats`, `roster`.
- Games/live/lines: `games`, `games teams`, `games players`, `games weather`, `games media`, `lines`, `game box advanced`, `live plays`.
- Drives/plays: `drives`, `plays`, `plays stats`, `plays stats types`, `plays types`.
- Statistics/players: `stats game advanced`, `stats game havoc`, `stats season`, `stats season advanced`, `stats player season`, `stats player success`, `stats player success game`, `stats categories`, `player usage`, `player search`, `player season overview`, `player returning`, `player portal`.
- PPA/probability: `ppa predicted`, `ppa teams`, `ppa games`, `ppa players games`, `ppa players season`, `metrics wp`, `metrics wp pregame`, `metrics fg ep`.
- Opponent-adjusted metrics: `wepa team season`, `wepa players passing`, `wepa players rushing`, `wepa players kicking`.
- Recruiting/ratings: `recruiting players`, `recruiting teams`, `recruiting groups`, `ratings sp`, `ratings sp conferences`, `ratings srs`, `ratings srs expanded`, `ratings elo`, `ratings fpi`, `rankings`.
- Playoffs/draft/coaches: `playoffs cfp`, `playoffs cfp participants`, `playoffs cfp games`, `draft teams`, `draft positions`, `draft picks`, `coaches`, `coaches profile`, `coaches seasons`, `coaches tenures`.

`README.md` and `skills/fbs-cli/SKILL.md` document endpoint mappings, result keys, and conditional filters. The actual Commander registrations and pure query validators remain the implementation source of truth. Preserve documented required-filter, ordered-range, bounded-number, and tier-error behavior.

For historical betting data, keep these contracts explicit:

- `fbs lines` maps to `/lines`, accepts `gameId`, `year`, `week`, `seasonType`, `team`, `home`, `away`, `conference`, and `provider`, requires `gameId` or `year`, and emits `lines`.
- `fbs teams ats` maps to `/teams/ats`, accepts required `year` plus optional `team` and `conference`, and emits `team_ats`.
- `scoreboard` output preserves embedded betting fields supplied by CFBD.

At the shell boundary, expose kebab-case flags and map them exactly to the generated-client query fields. In particular:

```text
season-type          -> seasonType
offense-conference   -> offenseConference
defense-conference   -> defenseConference
play-type            -> playType
game-id              -> gameId
athlete-id           -> athleteId
stat-type-id          -> statTypeId
exclude-garbage-time -> excludeGarbageTime
player-id             -> playerId
start-week            -> startWeek
end-week              -> endWeek
media-type            -> mediaType
search-term           -> searchTerm
coach-id              -> coachId
first-name            -> firstName
last-name             -> lastName
min-year              -> minYear
max-year              -> maxYear
start-year            -> startYear
end-year              -> endYear
recruit-type          -> recruitType
```

Use these generated-client enum domains unless an intentional `cfbd` upgrade changes them:

- `SeasonType`: `regular`, `postseason`, `both`, `allstar`, `spring_regular`, `spring_postseason`
- `DivisionClassification`: `fbs`, `fcs`, `ii`, `iii`
- `PlayoffCompetition`: `cfp`
- `PlayoffRound`: `first_round`, `quarterfinal`, `semifinal`, `championship`
- `UserUsageApi`: `all`, `cfb`, `cbb`
- `MediaType`: `tv`, `radio`, `web`, `ppv`, `mobile`
- Recruiting classifications: `JUCO`, `PrepSchool`, `HighSchool`
- Supported rankings poll: `cfp`

## Authentication and side effects

Resolve `CFBD_API_KEY` from an existing environment value, then an optional `.env` in the current working directory. Never overwrite an environment value with `.env`. Configure the client once with `Authorization: Bearer <key>`.

`fbs auth` must read the key from a masked TTY prompt or from stdin when piped, validate that exact candidate with one authenticated `GET /info` request, then create or update `.env` in the current working directory with `CFBD_API_KEY=<key>`. Before the interactive prompt, explain the validation request, conditional local save, and hidden input. Preserve unrelated `.env` entries, replace an existing key instead of adding duplicates, and create the file when it is missing. Validation must happen before writing so any provider or transport failure leaves `.env` unchanged. It must not accept the key as a command argument or echo it.

Do not add global credential folders, operating-system-specific path selection, or another credential fallback. `.env` is plaintext and must remain ignored by Git. Never commit, log, echo, or otherwise expose a saved or supplied key.

API commands must fail before a network request when no credential source is available. The missing-key document is:

```yaml
error:
  code: missing_api_key
  message: CFBD_API_KEY is required.
  hint: Set CFBD_API_KEY or run fbs auth to create .env in the current directory.
```

All CFBD endpoint operations are read-only, but live calls consume CFBD quota. Saving a credential is the only supported local side effect. Keep fixtures and mocked adapters as the default development path.

## Code boundaries

- `src/index.ts`: expose the importable Commander root and register first-level command groups without executing the process.
- `src/cli.ts`: executable Node entry; load the optional working-directory `.env` for endpoint commands, invoke the CLI, and set the process exit code.
- `src/commands/auth.ts`: register the local `auth` command and emit its key-safe YAML result.
- `src/auth/service.ts`: collect masked input, validate it once through `/info`, and save it only after validation succeeds.
- `src/auth/env-file.ts`: normalize keys and create or update `.env` in the current working directory.
- `src/commands/*.ts`: explicit `registerX(program)` functions; keep endpoint actions small.
- `src/cfbd/client.ts`: one-time provider client configuration from the resolved key.
- `src/cfbd/execute.ts`: response extraction and provider-error translation.
- `src/cfbd/query-builders.ts`: pure option-to-query mapping only.
- `src/transformers/*.ts`: endpoint-specific reshaping without provider calls.
- `src/output/yaml.ts`: deterministic success serialization.
- `src/output/error.ts`: deterministic stderr envelope.
- `src/utils/*.ts`: small normalization helpers.

Avoid a generic endpoint registry or schema-generation framework. Explicit commands and transformers are easier to audit against the generated client.

Keep query builders pure, omit only `undefined` query fields, and type them against the corresponding generated `cfbd` query type. Validate exact conditional requirements separately. Add parsing coverage whenever changing the `games` or `plays` command trees because each path has both an endpoint action and nested subcommands.

## Transformation rules

Transform for readability without inventing analysis:

- Recursively use snake_case keys and omit only `null` and `undefined`.
- Preserve `0`, `false`, meaningful empty strings, meaningful empty arrays, IDs, and unrounded numeric precision.
- Order keys meaningfully: IDs; season/week/time; names; context; measurements; nested details; URLs/notes.
- Format clocks as `MM:SS`.
- Group game `home` and `away` sides and derive only simple `status` and `matchup` presentation fields.
- Combine roster first/last names while retaining the player ID and recruiting/hometown identifiers.
- Convert team stat arrays to normalized maps. Parse only unambiguous integer or decimal strings; preserve ratios, clocks, and mixed strings.
- Flatten player box-score nesting and play-stat associations into explicit rows.
- Keep drive start/end context and individual play numerical context.
- Keep advanced offense/defense metrics and player usage dimensions nested; do not create hundreds of dotted keys.
- Group weather conditions. An unavailable paid/tiered endpoint is an error, not an empty list.
- Preserve historical provider lines, spreads, totals, moneylines, ATS wins/losses/pushes, average cover margin, and scoreboard betting fields without creating recommendations.

Do not calculate rankings, betting edges, schemes, predictions, or opinions in transformers.

## Output and error contracts

Success writes one YAML document to stdout:

```yaml
command: games
endpoint: /games
query:
  year: 2026
count: 0
games: []
```

The local `auth` command is the only success-envelope exception:

```yaml
command: auth
status: saved
env_file: /project/.env
```

This success document means `/info` accepted the entered key and `.env` was updated. Validation consumes one CFBD API request. Authentication, network, quota, and server failures use the normal structured error codes and do not modify `.env`.

When `auth` runs interactively, its brief explanation and masked prompt are the sole permitted prose on stderr; an interactive cancellation or invalid key therefore places them before the YAML error. Piped `auth` input emits no explanation or prompt and retains the YAML-only stream contract for agents and scripts.

`query` includes only supplied fields, `count` is the top-level record count, and the final key is endpoint-specific. Emit no prose, logs, banners, spinners, colors, anchors, or aliases. End output with exactly one newline.

Failures write one YAML document to stderr and exit nonzero:

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

Use stable machine-actionable codes, preserve useful provider messages, and add a hint only for deterministic corrections. Never print a stack trace, request authorization header, or API key by default. Keep stdout empty on failure.

## Testing expectations

For every command, cover exact option-to-query mapping and conditional validation. Transformer fixtures should prove snake_case conversion, null removal, ID preservation, nested grouping/flattening, clock formatting, and unchanged numerical precision. CLI tests should use a mocked API layer and assert YAML parsing, stream separation, exit codes, nested command parsing, and complete help options.

For `auth`, cover missing-file creation, preservation of unrelated `.env` entries, replacement without duplicate keys, input normalization, the interactive explanation and hidden input, silent piped input, file failures, key redaction, exactly one `/info` validation request, and no write when validation fails. Distribution smoke tests must exercise `auth` only inside an isolated temporary working directory with a mocked fetch; the default suite must never call live CFBD.

When changing behavior:

1. Update or add offline tests first.
2. Run `bun run typecheck` and `bun test`.
3. Run `bun run build:npm` for distribution changes; also run `bun run build:native` when changing the optional native distribution.
4. Run `CFBD_LIVE_TESTS=1 bun test tests/live` only when explicitly authorized and keyed.
5. Keep `README.md` and `skills/fbs-cli/SKILL.md` synchronized with command/query changes.

Do not weaken a contract merely to make a snapshot pass. Inspect the generated provider type and fixture, then make the smallest intentional change.

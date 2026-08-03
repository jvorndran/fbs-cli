# Contributing

Thanks for helping improve FBS CLI. The project intentionally stays a thin,
read-only interface over CollegeFootballData:

```text
Commander options -> pure query builder -> Zod validation -> cfbd client -> endpoint transformer -> YAML
```

Before proposing a feature, confirm that it fits the endpoint-shaped,
read-only scope in [AGENTS.md](AGENTS.md) and the public compatibility policy
in [docs/compatibility.md](docs/compatibility.md).

## Development setup

Requirements:

- Node.js 22.12.0 or newer.
- Bun 1.3.14, matching `packageManager` and the lockfile.

```bash
git clone https://github.com/jvorndran/fbs-cli.git
cd fbs-cli
bun install --frozen-lockfile
bun run src/cli.ts --help
```

Never put a real CFBD key in a command, fixture, test, issue, commit, log, or
agent prompt. The default development path is entirely offline.

## Make a focused change

- Keep command registrations and endpoint transformers explicit. Do not add a
  generic endpoint registry or schema-generation layer.
- Keep query builders pure, omit only `undefined`, and type them against the
  pinned generated-client query type.
- Preserve provider IDs, `0`, `false`, meaningful empty values, and numeric
  precision. Omit only nullish values.
- Add parsing coverage when changing the `games` or `plays` trees because each
  has parent actions and nested subcommands.
- Keep `README.md` and `skills/fbs-cli/SKILL.md` synchronized with executable
  help and result keys.
- Do not add provider writes, custom pagination, caches, output switches,
  model execution, spinners, or another local-write command.

## Verify

Run the offline release gate before opening a pull request:

```bash
bun run typecheck
bun test
bun run check:docs
bun run build:npm
bun run test:node
bun run test:pack
```

For larger changes, also run `bun run test:coverage`. The packed smoke uses
local dependencies and does not call npm or CFBD over the network after the
tarball is created.

Live tests are maintainer-supervised and consume provider quota. Do not run
them without explicit authorization and a user-provided `CFBD_API_KEY`:

```bash
bun run test:live
```

## Pull requests

Keep the pull request narrowly scoped and explain:

- Which endpoint or contract changes.
- Which offline tests prove the behavior.
- Whether help, README, skill, compatibility, or release notes changed.
- Why the change remains read-only and key-safe.

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE).

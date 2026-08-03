# Version 1 compatibility policy

FBS CLI follows [Semantic Versioning](https://semver.org/). The policies below
describe what scripts and agents can rely on throughout the `1.x` line.

## Stable through version 1

The following changes require a new major version unless needed to correct a
security problem that cannot be fixed compatibly:

- Removing or renaming the `fbs` executable, an endpoint command path, a
  documented flag, an endpoint result key, or a stable error code.
- Changing a documented flag's direct mapping to a CFBD query field.
- Changing the success envelope keys `command`, `endpoint`, `query`, `count`,
  or the endpoint-specific final key.
- Changing the error envelope from `error`, changing stdout/stderr separation,
  or changing the documented success and failure exit behavior.
- Changing an existing output field's type or nesting in a way that breaks a
  YAML parser consuming the documented transformer contract.
- Changing credential precedence, the project-local `.env` location, the
  validate-before-save guarantee, or the rule that `auth` is the only command
  permitted to prompt or write locally.
- Removing `auth.active_source`, the environment-precedence warning, the
  30-second `network_timeout`, `cfbd_invalid_response`, or quiet stdout
  `EPIPE` behavior.
- Adding provider writes, hidden analysis, or another side effect to an
  existing read-only command.

The exact filter rules, enum domains, result keys, and endpoint mappings in
the executable help and README are part of this contract.

The stable exit-code classes are `0` for success/help/version/quiet stdout
`EPIPE`, `2` for locally correctable invocation, query, or credential
configuration failures, and `1` for provider, network, filesystem, or
unexpected runtime failures.

## Allowed in a minor release

A compatible minor release may add:

- New read-only commands when the pinned official client adds GET routes.
- New optional query flags that map directly to provider parameters.
- Newly accepted provider enum values.
- New output fields or nested provider details without removing or changing
  existing fields.
- New machine-actionable error codes or deterministic hints for previously
  unclassified failures.
- Documentation, examples, fixtures, or agent-guide workflows.

Consumers should parse YAML, ignore unknown keys, and avoid depending on the
textual ordering of keys. The serializer remains deterministic, but key order
is a readability aid rather than a data-model guarantee.

## Patch releases

Patch releases fix defects, improve validation or redaction, and update
documentation without intentionally changing the public contract. A security
fix may be shipped immediately; any unavoidable compatibility impact will be
called out prominently in the changelog.

## Provider-controlled behavior

FBS CLI pins the official `cfbd` client exactly and audits its generated GET
surface before an upgrade. CollegeFootballData controls endpoint availability,
subscription tiers, quotas, provider response data, and upstream removals.
Those external conditions are not availability guarantees from this project.

When an upstream change cannot be represented compatibly, the existing v1
command remains stable where practical and the migration is reserved for the
next major version.

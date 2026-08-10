# Changelog

All notable changes to this project are documented here. The project follows
[Semantic Versioning](https://semver.org/) and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-08-10

### Added

- A configurable 25,000-character output guard with structured recovery for
  responses that are too large for agent context.
- Optional filters for selected broad responses, while preserving the exact
  request in the YAML envelope.
- A compact agent skill command/filter index covering all 71 commands.

## [1.0.0] - 2026-08-02

### Added

- Stable command coverage for all 71 GET routes in the pinned `cfbd` 5.21.0
  client, including historical betting lines and ATS records.
- Project-local, masked `fbs auth` setup with one-request validation before
  saving and key-safe structured failures.
- Deterministic YAML success and error contracts designed for terminals,
  scripts, and agents.
- Versioned `fbs-cli` agent guide, compatibility policy, contributor guide,
  security policy, release process, license, and third-party notices.
- Cross-platform CI, packed-artifact smoke coverage, GitHub Pages deployment,
  and npm trusted publishing with provenance.

### Changed

- The npm build bundles the pinned generated CFBD client and its exact fetch
  client while retaining `commander`, `yaml`, and `zod` as normal runtime
  dependencies.
- Package and executable versions now share `package.json` as their single
  source of truth.

### Security

- Bun automatic dotenv loading is disabled, including for native builds, so
  credentials are resolved only through the documented Node entrypoint and
  project-local authentication flow.

## Pre-1.0 history

Versions `0.1.x` through `0.2.1` established the endpoint surface,
transformers, offline fixtures, npm distribution, and local credential flow.
The repository's trustworthy release-tag history begins with `v1.0.0`; older
tags are not reconstructed after publication.

[1.0.0]: https://github.com/jvorndran/fbs-cli/releases/tag/v1.0.0
[1.1.0]: https://github.com/jvorndran/fbs-cli/releases/tag/v1.1.0

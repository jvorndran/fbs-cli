# Security policy

## Supported versions

Security fixes are provided for the latest `1.x` release. Users should upgrade
to the newest published patch before reporting a problem.

## Report a vulnerability privately

Use the repository's private vulnerability reporting form under GitHub's
Security tab. Do not open a public issue for a vulnerability and do not attach
an API key, `.env` file, authorization header, or unredacted provider response.

Include only the minimum safe reproduction details:

- FBS CLI, Node.js, and operating-system versions.
- Installation method and affected command path.
- Expected and observed behavior with credentials replaced by `[REDACTED]`.
- Whether the problem exposes data, writes a local file, or changes network
  behavior.

If a CFBD key may have been disclosed, rotate or revoke it through the
provider immediately. Do not wait for this project to investigate first.

## Security boundaries

- Endpoint commands are read-only and must not write locally or prompt.
- `fbs auth` is the only local-write exception. It validates the exact
  candidate with one authenticated `GET /info` request before updating the
  current directory's plaintext `.env` file.
- Existing `CFBD_API_KEY` environment values take precedence over `.env`.
- The package must not log keys, authorization headers, stack traces, or
  sensitive request data by default.
- Default tests and packed-artifact checks are offline. Live tests are opt-in.

These boundaries are release contracts. A change that weakens one requires a
security review before merge.

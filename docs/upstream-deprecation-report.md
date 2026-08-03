# Draft upstream report: deprecated generated fetch client

> Draft only. Do not submit this issue without the maintainer's confirmation.

## Suggested title

`cfbd@5.21.0` installs the deprecated `@hey-api/client-fetch` package

## Suggested issue body

Installing the current TypeScript client produces an npm deprecation warning
because `cfbd@5.21.0` declares this runtime dependency:

```json
{
  "@hey-api/client-fetch": "^0.6.0"
}
```

The npm registry marks `@hey-api/client-fetch@0.6.0` as deprecated because
newer Hey API tooling bundles the fetch client directly into
`@hey-api/openapi-ts`. This warning appears even though the CFBD client itself
is current and usable, which can make clean installs look unsupported.

Reproduction:

```bash
npm init --yes
npm install cfbd@5.21.0
```

Could the TypeScript client be regenerated with a maintained Hey API release,
or otherwise published without the deprecated runtime package? Ideally the
replacement would preserve the existing exported endpoint functions and the
ability to pass a private generated-client instance per request.

No CFBD API key or live endpoint request is needed to reproduce the warning.

## Local mitigation used by FBS CLI

FBS CLI pins `cfbd@5.21.0` and `@hey-api/client-fetch@0.6.0` as development
dependencies, bundles their code into its npm entry, includes both MIT notices,
and verifies that neither package appears in the installed runtime dependency
tree. This removes the warning for FBS CLI users but does not resolve the
upstream package metadata.

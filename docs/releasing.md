# Release process

This document is for maintainers. Normal contributors never need npm publish
credentials and should not run live CFBD tests for a release.

## One-time repository setup

1. Keep the repository public so npm can attach public provenance.
2. Set the GitHub repository description to "Read-only CLI for all 71
   CollegeFootballData GET routes with deterministic YAML output", the website
   to <https://jvorndran.github.io/fbs-cli/>, and topics to
   `college-football`, `cfbd`, `cli`, `typescript`, `yaml`, `sports-data`, and
   `agent-cli`.
3. In npm package settings for `@jvorndran/fbs-cli`, configure a GitHub Actions
   trusted publisher for repository `jvorndran/fbs-cli`, workflow
   `publish.yml`, and environment `npm`.
4. Create the GitHub `npm` environment. A required reviewer is recommended if
   another maintainer is available.
5. Configure GitHub Pages to use GitHub Actions and confirm its public URL is
   <https://jvorndran.github.io/fbs-cli/>.
6. Upload `assets/social-preview.png` under GitHub's repository social preview
   settings; the Pages site uses the same image for Open Graph and Twitter cards.
7. Protect `main` and require the `CI` checks before merge.
8. Enable secret scanning, push protection, and private vulnerability
   reporting.

The publish workflow uses OIDC. Do not add an npm automation token or
`NODE_AUTH_TOKEN` secret.

## Prepare a release

1. Create a release branch from a clean, current `main`.
2. Update `package.json` and `CHANGELOG.md`. The package version is the single
   version source used by the executable.
3. Run:

   ```bash
   bun install --frozen-lockfile
   bun run check:release
   bun run test:coverage
   ```

4. Review the exact allowlist and size reported by `test:pack`. The npm build
   must bundle `cfbd` and `@hey-api/client-fetch`, keep only `commander`,
   `yaml`, and `zod` as runtime dependencies, and contain the skill, license,
   and third-party notices.
5. Do not run `tests/live` unless the user explicitly authorizes the quota
   cost and supplies a key outside logs and prompts.
6. Review `docs/upstream-deprecation-report.md`; it is a draft and must not be
   submitted to the CFBD maintainer without separate confirmation.
7. Open and merge the release PR after CI passes.

## Publish

1. Draft a GitHub Release from the exact merged commit.
2. Use tag `v<package version>`, for example `v1.0.0`, and copy the matching
   changelog section into the release notes.
3. Publish the GitHub Release. This deliberate action triggers
   `.github/workflows/publish.yml`.
4. The workflow verifies tag/version equality, repeats the offline gates,
   builds and smokes the exact tarball, and publishes it through npm trusted
   publishing with provenance and public access.

The workflow must run on a GitHub-hosted runner with Node 24 and a current npm
CLI that supports trusted publishing. It must not publish from a branch push.

## Verify

After the workflow succeeds:

1. Confirm npm shows the expected version, public provenance, MIT license, and
   repository links.
2. In a clean directory, install the exact version and run:

   ```bash
   npm install --global @jvorndran/fbs-cli@x.y.z
   fbs --version
   fbs --help
   ```

3. Confirm the GitHub Release, Pages site, README badges, and changelog links.
4. Do not overwrite a published version. If a release is defective, deprecate
   it when appropriate and publish a corrected patch. Avoid unpublishing
   except for a severe security or legal incident.

## Summary

Describe the focused change and the endpoint or public contract it affects.

## Verification

- [ ] `bun run typecheck`
- [ ] `bun test`
- [ ] `bun run check:docs`
- [ ] `bun run build:npm`
- [ ] `bun run test:node`
- [ ] `bun run test:pack`
- [ ] README, skill, compatibility policy, and changelog are updated when needed.
- [ ] No API key, `.env` content, authorization header, or sensitive response is present.
- [ ] No live CFBD test was run without explicit authorization.
- [ ] The change remains read-only; only `fbs auth` may prompt or write locally.

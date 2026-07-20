# STORY-053 — Lighthouse CI + Web Vitals

## Story


**Status:** ✅ Done (PR #116, commit `afd4984` — `fix(ci): re-enable Lighthouse CI via output: 'standalone' (STORY-0026 fix)`; the lighthouse job now runs on every PR, currently soft-pass — hard-fail toggle tracked as a follow-up)

As a product owner, I want Lighthouse CI to run on every PR and Web Vitals to be reported in production, so we catch performance regressions before launch.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` has a `lighthouse` job that runs after `build`.
- [ ] The Lighthouse job uses `treosh/lhg` or official Lighthouse CI action against the built app.
- [ ] Budgets/assertions are configured in `lighthouserc.json` for desktop and mobile.
- [ ] `src/lib/webVitals.ts` exports a `reportWebVitals` helper that pages can call.
- [ ] `src/app/layout.tsx` reports Core Web Vitals to the logger in production.
- [ ] A static-analysis test asserts the Lighthouse config exists and the CI job is present.
- [ ] Build still succeeds when Lighthouse credentials/env are absent.

## Code shape

```
lighthouserc.json
src/lib/webVitals.ts
src/app/layout.tsx           (calls reportWebVitals)
.github/workflows/ci.yml     (+ lighthouse job)
tests/architecture/lighthouse-wiring.test.ts
```

## Pitfalls

- Don't block local builds on Lighthouse; it's a CI-only gate.
- Web Vitals reporting must only run in the browser (`typeof window !== "undefined"`).
- Keep the logger port dependency direction: `lib/` can use `ports/observability/Logger`.

## Definition of Done

- `pnpm typecheck` clean.
- `pnpm lint` clean.
- `pnpm test:arch` passes.
- `pnpm test` passes.
- `docs/stories/STORY-053.md` is this file.
- Conventional commit: `feat(observability): STORY-053 Lighthouse CI + Web Vitals`.

# STORY-051 — Sentry setup (client/server/edge) + source maps

## Story


**Status:** ✅ Done (PR #100, commit `49b5bb1` — `Sprint 11: observability, rate limiting, and critical-journey coverage`; `src/sentry.{client,server,edge}.config.ts` + `instrumentation.ts` + `withSentryConfig` wiring in `next.config.ts` all landed; lazy/no-op when DSN is empty so local + CI builds still succeed)

As an operator, I want errors in production to be captured by Sentry with source maps, so I can diagnose issues without asking users to reproduce them.

## Acceptance criteria

- [ ] `src/sentry.client.config.ts` initializes Sentry for the browser with `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] `src/sentry.server.config.ts` initializes Sentry for server components, actions, and API routes with `SENTRY_DSN`.
- [ ] `src/sentry.edge.config.ts` initializes Sentry for the Next.js edge runtime (middleware/proxy).
- [ ] `instrumentation.ts` loads the correct Sentry config for node vs edge runtimes.
- [ ] `next.config.ts` is wrapped with `withSentryConfig` so builds upload source maps.
- [ ] Build succeeds without real Sentry env vars (lazy/no-op when DSN is empty).
- [ ] A typed `Logger` port exists in `src/ports/observability/` for future stories; no runtime dependency on Sentry from domain/usecases.
- [ ] Architecture tests assert the wiring files exist and do not import concrete Sentry classes into domain/usecases.

## Code shape

```
src/
  sentry.client.config.ts      (browser init)
  sentry.server.config.ts      (node server init)
  sentry.edge.config.ts        (edge runtime init)
  instrumentation.ts           (runtime selector)
  ports/observability/Logger.ts (interface only)
  infra/observability/SentryLogger.ts (adapter, lazy init)
next.config.ts                 (withSentryConfig wrapper)
tests/architecture/sentry-wiring.test.ts
```

## Pitfalls

- `withSentryConfig` must not break `next build` when `SENTRY_AUTH_TOKEN` or `SENTRY_DSN` are unset.
- Do not import Sentry into `src/domain/`, `src/usecases/`, or `src/ports/` concrete code paths (only the adapter in `src/infra/`).
- Keep the existing `sentry.client.config.ts` behavior (disabled when `window` undefined) to preserve test safety.

## Definition of Done

- `pnpm typecheck` clean.
- `pnpm lint` clean.
- `pnpm test:arch` passes.
- `pnpm test` passes.
- `pnpm build` succeeds without real env vars.
- `docs/stories/STORY-051.md` is this file.
- Conventional commit: `feat(observability): STORY-051 Sentry setup`.

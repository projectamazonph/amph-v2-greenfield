# STORY-052 — Structured logging (Pino) + `withActionTracing` HOC + redaction

## Story

As an operator, I want structured, redacted logs from every server action and use case, so I can debug production issues without leaking PII or credentials.

## Acceptance criteria

- [ ] `Logger` port exists in `src/ports/observability/Logger.ts` with `info`, `warn`, `error`, `debug`, and `child` methods.
- [ ] `PinoLogger` adapter exists in `src/infra/observability/PinoLogger.ts` with safe defaults (redact `password`, `token`, `secret`, `cookie`, `authorization`).
- [ ] `buildProductionContainer()` wires the singleton `PinoLogger` under `logger`.
- [ ] `buildTestContainer()` wires a `TestLogger` that buffers log lines for assertions.
- [ ] `withActionTracing` higher-order function wraps server actions: logs start, success, error, and duration; never throws through the wrapper.
- [ ] `AppContainer` exposes `logger` so any use case or action can receive it via constructor injection (future stories).
- [ ] Architecture tests assert: only `infra/observability/` imports `pino`; domain/usecases/ports never import `pino` directly.

## Code shape

```
src/
  ports/observability/Logger.ts
  infra/observability/PinoLogger.ts
  infra/observability/TestLogger.ts
  lib/withActionTracing.ts
  composition/container.ts        (+ logger field)
  composition/container.test.ts   (+ logger field)
tests/architecture/logging-wiring.test.ts
```

## Pitfalls

- `pino` must not be instantiated at module load in production; lazy init inside the adapter.
- Redaction list must include common secret field names and nested query params.
- `withActionTracing` must preserve the original action's return type and not swallow Next.js redirects (`NEXT_REDIRECT`).

## Definition of Done

- `pnpm typecheck` clean.
- `pnpm lint` clean.
- `pnpm test:arch` passes.
- `pnpm test` passes.
- `docs/stories/STORY-052.md` is this file.
- Conventional commit: `feat(observability): STORY-052 structured logging + action tracing`.

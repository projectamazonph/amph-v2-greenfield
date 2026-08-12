# Operating guidelines

**Reviewed:** 2026-08-12

## Git discipline

- Branch from the current `main`.
- Use one concern per branch and conventional commits.
- Stage explicit paths. Do not push directly to `main`.
- Open a PR, wait for every required check, and squash merge.
- Do not force-push shared branches.

## Engineering loop

1. Reproduce the behavior or verify the gap in source.
2. For behavior changes, write the smallest failing test.
3. Implement the minimum change.
4. Refactor without changing behavior.
5. Run the relevant focused tests, then the full quality gate.
6. Review the diff for secrets, generated files, and documentation drift.

## Architecture

Dependency direction stays inward:

```text
app -> usecases -> ports <- infra
       domain
```

Domain and use-case code must not import framework or infrastructure modules. Mutations use server actions except webhooks, uploads, and third-party callbacks. Every admin mutation records an audit log.

## Quality gate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:arch
pnpm test:coverage
pnpm build
pnpm test:e2e
```

CI also runs Lighthouse and secret scanning. The last complete local gate on 2026-08-12 passed 3,816 Vitest tests with 2 skipped and 665 architecture checks.

## Production rules

- Canonical production origin: `https://projectamazonph.vercel.app`
- Retired origin: `https://amph-v2-greenfield.vercel.app`
- Do not commit credentials or local `.env` files.
- Production file storage requires `BLOB_READ_WRITE_TOKEN` and fails closed when it is unavailable.
- Do not seed or migrate a database until `DATABASE_URL` has been checked.

## Documentation

Update `STATE.md`, `FEATURES.md`, `CHANGELOG.md`, affected runbooks, and story status when behavior changes. Keep historical audit statements intact unless the document explicitly presents itself as current.

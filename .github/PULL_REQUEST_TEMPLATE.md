## Summary

<!-- One or two sentences. What does this PR do, and why? -->

## Story

<!-- Link the story file. e.g. closes STORY-042, fixes STORY-052 -->

Closes #

## Type of change

- [ ] feat (new feature)
- [ ] fix (bug fix)
- [ ] refactor (no behavior change)
- [ ] docs (documentation only)
- [ ] test (adding or fixing tests)
- [ ] chore (tooling, deps, build)

## Architecture

<!-- Only fill in if this PR touches a port, use case, or domain file. -->
- [ ] No new imports across the SOLID boundary (domain/ports/usecases do not import from next/prisma/paymongo/resend/sentry)
- [ ] No `number` for money
- [ ] No thrown exceptions across layer boundaries (use `Result<T, E>`)
- [ ] No direct prisma calls outside `src/infra/`
- [ ] No admin mutation without an `AuditLog` entry
- [ ] If adding a port, both real and fake adapters are included

## Test plan

<!-- What did you run? What should the reviewer run? -->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:coverage` (thresholds met)
- [ ] `pnpm test:e2e` (if user-facing change)
- [ ] Manual smoke (describe what you clicked)

## Checklist

- [ ] I followed the SOLID contract in `AGENTS.md`
- [ ] I followed the voice rules in `docs/voice-guide.md`
- [ ] I added or updated a test
- [ ] I updated `docs/stories/STORY-XXX.md` if acceptance criteria changed
- [ ] I added an entry to `CHANGELOG.md`
- [ ] I will update `SESSION-HANDOVER.md` after merge

## Screenshots / Recordings

<!-- If the PR changes user-facing UI, attach before/after. -->

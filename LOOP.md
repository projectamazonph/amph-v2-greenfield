# Loop Configuration - AMPH v2 Daily Triage

**Reviewed:** 2026-08-12

## Active Loops

| Pattern      | Cadence | Status         | Command                                        |
| ------------ | ------- | -------------- | ---------------------------------------------- |
| Daily Triage | 1d      | L1 report-only | Mavis agent reads STATE.md + runs triage skill |

## Project Context

AMPH v2 is a deployed Next.js 16 modular monolith with a five-layer SOLID architecture. Production is `https://projectamazonph.vercel.app`. Current concerns are:

- Preserve the repaired student course, lesson, checkout, and password-reset journeys
- Monitor production payment, email, database, and Blob integrations
- Keep simulator scores formative
- Complete operator-owned restore and webhook drills

## Human Gates

- **L1 (current):** Report-only. Update STATE.md. No code changes.
- **L2:** After Loop Ready score holds ≥ 3 runs AND human approves. Fix docs, tests, dependency patches.
- **L3:** After harness-foundation lands. Auto-merge for safe paths (lint, format, tests).
- No auto-merge for `src/`, `prisma/`, `app/` paths until L3 explicitly approved.

## Safety

Full denylist and auto-merge policy in `docs/safety.md`.

## Connectors

- GitHub API: read issues, PRs, CI status, workflows
- No writes via MCP until L2+
- Sentry alerts via webhook for production incidents (future)

## Budget

- Daily cap: 300k tokens (raised from default 100k — repo is substantial)
- If token spend hits 80% daily cap, switch to report-only for remainder of day
- Review `loop-budget.md` weekly

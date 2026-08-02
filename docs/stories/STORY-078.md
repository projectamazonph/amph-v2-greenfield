# STORY-078: Mark simulator results formative; block from certification/job-readiness

**Sprint:** 15
**Points:** 1
**Epic:** Certification safety + subject-matter accuracy

## Status

**Status:** Done — 2026-08-02, production-readiness fix session.

## Goal

Every simulator result view must make it unambiguous that the score is formative
practice feedback, not a certification, job-readiness signal, or hiring credential.
Per `AGENTS.md`'s simulator guardrail: "Simulator scores are formative. Never label
them 'certified' or 'hiring ready' in copy."

## What shipped

- `src/components/tools/FormativeScoreNotice.tsx` — a small, shared, stateless
  component ("Practice score only. Not a certification, job-readiness signal, or
  hiring credential.") with no hooks and no `"use client"` directive, so it renders
  unchanged in both the server-rendered `BidElevatorResult` and the client-rendered
  forms for the other four simulators.
- Wired into all 5 simulator result views: `BidElevatorResult.tsx`,
  `ListingAuditForm.tsx`, `CampaignBuilderForm.tsx`, `StrTriageForm.tsx`,
  `KeywordResearchForm.tsx`.
- `src/components/tools/__tests__/FormativeScoreNotice.test.ts` — a regression test
  asserting all 5 result files import and render the component, and that the
  component's own copy never contains "is certified" or "hiring ready".

## Explicitly out of scope

This story is the UI-copy half of Sprint 15's certification-safety goal. It does
**not** change any scoring logic, ground truth, or grading policy — those are
STORY-079 through STORY-084, and STORY-083/084 specifically need Ryan's Amazon PPC
expertise, not an agent's guess (per the sprint plan's owner note). This story only
ensures the score is never presented as more authoritative than it is.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run src/components/tools/__tests__/FormativeScoreNotice.test.ts
pnpm lint
```

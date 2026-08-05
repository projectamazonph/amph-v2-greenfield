# STORY-101 — Catalog card meta + "FBA" copy fixes

**Sprint:** 16 follow-up
**Points:** 1
**Epic:** Catalog
**Owner:** TBD
**Status:** Done

## Goal

Fix two student-facing bugs on the public `/courses` catalog that a smoke
test on 2026-08-05 surfaced against the production deployment:

1. The catalog card meta line rendered a bare "0 lessons" for the
   `Ultimate Transformation` tier. The tier is a live-cohort offering
   (weekly live classes with Ryan + a 1:1 portfolio review, no on-demand
   lessons in the database), so the line is correct as data but wrong as
   UX. A prospect comparing the three cards reads "0 lessons" and assumes
   the tier is broken.
2. The page metadata and hero subtitle described the offering as
   "Expert-led Amazon FBA training, taught in Filipino." The landing page
   FAQ is explicit that the program teaches **agency-side PPC for VAs**,
   not Amazon FBA selling. The contradiction will hurt ad quality scores
   and confuse prospects who clicked through from the landing.

## Scope (what this story ships)

- `src/app/courses/page.tsx`
  - The card meta block branches on `lessonCount > 0`. Tiers with no
    on-demand lessons now render `Live cohort + 1:1 review` instead of
    `0 lessons`.
  - The `metadata.description` and hero subtitle are re-aligned to the
    landing's positioning: "Amazon PPC training for Filipino VAs.
    Agency-side work, taught in Filipino."

- `src/app/courses/__tests__/courses-page.test.ts`
  - Adds a "student-facing copy" describe block asserting the page does
    not say "Amazon FBA" and does say "Amazon PPC" + "agency-side".
  - Adds a "catalog card meta line" describe block asserting the page
    branches on `lessonCount > 0` and renders a "Live cohort" label.

## Verification

- `pnpm tsc --noEmit` — zero type errors.
- `pnpm lint` — zero ESLint errors (boundary rules + voice still clean).
- `pnpm test src/app/courses/__tests__/courses-page.test.ts` — all
  assertions pass.
- Manual: open the catalog at `https://projectamazonph.vercel.app/courses`
  and confirm the Ultimate card now reads "Live cohort + 1:1 review"
  instead of "0 lessons", and the hero + meta description match the
  landing's "PPC, agency-side, for VAs" positioning.

## Out of scope

- No database change. The seed data for `ultimate-transformation` is
  correct (no on-demand modules/lessons; the tier is live-cohort only).
- No change to the `ListCatalogCourses` use case. The fix is purely
  presentation on the catalog card.
- No change to admin form placeholders in
  `src/app/admin/courses/new/page.tsx` (those are intentionally filler
  for the admin to overwrite).

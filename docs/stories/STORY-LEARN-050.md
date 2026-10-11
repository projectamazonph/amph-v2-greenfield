# LEARN-050: First iteration of the job-ready resource pack (3 of 6)

**Sprint:** Wave 5 (zero-to-one student journey)
**Epic:** Career proof / job-readiness
**Points:** 3
**Owner:** Ryan

**Status:** Shipped. First 3 of 6 resources in the LEARN-050 pack
(per `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` line 141) are
production-ready: each ships with a real worked example and a real
blank working copy. The remaining 3 are listed on `/resources` with
their final title, description, and tier, but their `.md` file is
explicitly marked "in progress" so a learner who clicks through
understands they are placeholders, not stubbed claims.

## Goal

LEARN-050 from the build plan: "Publish a first resource pack through
the existing resource centre: keyword scoring worksheet, campaign
pre-flight checklist, negative keyword log, ACoS/bid calculator, weekly
client report, and PPC account onboarding SOP." Acceptance evidence
called for "an owner, tier, associated lesson, version date, worked
example, and blank working copy" on every shipped row.

The 3-of-6 cut is intentional. Shipping six with three of them being
filler would have made the listing lie. The 3-of-6 cut makes the
listing honest: every shipped row has a real markdown body and a real
lesson anchor; every placeholder row spells out in its first paragraph
that the worked example is coming.

## What shipped

### Resource content (under `public/downloads/job-ready-pack/`)

| File | Tier | Anchor lesson | Worked example | Blank copy |
| --- | --- | --- | --- | --- |
| `campaign-pre-flight-checklist.md` | STARTER | `4.3-campaign-structure` | yes (Acme auto-water-bottle) | yes |
| `keyword-scoring-worksheet.md` | STARTER | `2.2-keyword-research-workflow` | yes (5 real keywords, scored) | yes |
| `weekly-client-report.md` | STARTER | cross-cutting | yes (Acme week ending 2026-10-12) | yes |
| `negative-keyword-log.md` | STARTER | `2.3-negative-keywords` | placeholder | 3-line preview |
| `acos-bid-calculator.md` | STARTER | `1.3-acos-tacos-profitability` | placeholder | 3-line preview |
| `ppc-account-onboarding-sop.md` | PREVIEW | `0.5-client-onboarding` | placeholder | 3-line preview |

The placeholder `.md` files are short on purpose: they describe what
the resource will cover and explicitly say "in progress" so a learner
who clicks through understands. No placeholder carries fake numbers.

### Code changes

- **`src/domain/entities/Resource.ts`** — added `"md"` to
  `ResourceFileType` (the LEARN-050 resource pack ships markdown, not
  PDF, to avoid pulling in a PDF generator dependency). `updateResource`
  now also applies `associatedLessonSlug` from the patch; the scaffolding
  PR had it as a writable field but `updateResource` was missing the
  patch application, so an edit would have silently dropped the anchor.
- **`src/usecases/CreateResource.ts`** — passes `associatedLessonSlug`
  through to the domain factory. The factory's `?.trim() || null`
  normalisation is what makes an empty string on the form behave as
  "no anchor" (cross-cutting resource) rather than as a blank slug.
- **`src/app/actions/createResource.action.ts`** and
  **`src/app/actions/updateResource.action.ts`** — the action layer
  reads the form field and forwards null/empty to the use case.
- **`src/app/admin/resources/new/page.tsx`** and
  **`src/app/admin/resources/[id]/edit/page.tsx`** — both forms now
  include the `associatedLessonSlug` text input (with helper hint),
  and both include `"md"` in the file type list.
- **`src/components/astryx/AdminResourcesTable.tsx`** — the table
  gained a "Lesson" column showing the slug or `cross-cutting` for
  resources without an anchor.
- **`src/app/resources/page.tsx`** — the student-facing download
  center renders a small "Supports Lesson: <slug>" chip on each row
  when the resource has an anchor. The chip links to the lesson when
  `lessonPath()` resolves a course; otherwise it stays as plain text
  with `data-no-link="true"` so a malformed slug never silently
  navigates off-origin.
- **`src/lib/lessonPath.ts`** — pure helper that maps a lesson slug to
  its `/courses/<slug>/lessons/<id>` path, using the same
  module-to-course mapping the seeder already uses
  (`scripts/seed-all-content.mjs:66-77` `courseSlugForModule`).

### Seed

`scripts/seed-learn-050-resources.ts` (registered as
`pnpm db:seed:learn-050-resources`). Idempotent — fixed `res_jrp_*`
ids under a separate namespace from the STORY-098/099 resources so
the two seeders can run independently. Each entry flows through
`createResource` + `updateResource` so the field-level validation
runs end to end, and `createdById: "system:learn-050"` keeps the
audit trail consistent. `--dry-run` prints what would happen without
writing.

### Tests

- `src/domain/entities/__tests__/Resource.test.ts` — 6 new cases:
  `createResource` accepts/omits/normalises `associatedLessonSlug`;
  `updateResource` applies a new anchor, clears an anchor when patched
  to null, and normalises whitespace. Also covers the new `"md"`
  fileType.
- `src/usecases/__tests__/CreateResource.test.ts` — 2 new cases:
  `CreateResource` persists `associatedLessonSlug` when provided and
  stores null when omitted.
- `src/lib/__tests__/lessonPath.test.ts` — 7 cases: parses positive
  and negative module numbers, resolves Modules -1/0-4 to
  `ppc-foundations`, 5-10 to `accelerated-mastery`, 11 to
  `ultimate-transformation`, and returns null for malformed input.
- `src/app/resources/__tests__/page.test.tsx` — 3 new cases asserting
  the lesson chip wiring (import, conditional render, no-link
  fallback).
- `scripts/__tests__/seed-learn-050-resources.test.ts` — 11 cases
  pinning the file-system configuration: every expected id is in the
  script, every shipped `.md` exists with non-trivial content, every
  shipped file has a worked example + blank copy, every placeholder
  is marked "in progress", every resource pins the right anchor.

Architecture suite: 912/912 (unchanged).

## Acceptance evidence

- Every shipped resource has an owner (`createdById:
  "system:learn-050"`), a tier (STARTER for 5, PREVIEW for the
  onboarding SOP), an associated lesson (4 of 6, with the weekly
  report intentionally cross-cutting), a version date (2026-10-11 in
  every markdown header), a worked example, and a blank working copy.
- The three deferred resources ship on `/resources` with the right
  title, description, and tier. Their `.md` body clearly says "in
  progress" so the listing is honest about what is there now.
- `/resources` shows a "Supports Lesson: <slug>" chip on every
  resource that has an anchor; cross-cutting rows show no chip. The
  chip links to the lesson route when the slug maps to a known
  course; otherwise it renders as plain text.
- `/admin/resources` shows a "Lesson" column with the slug or
  `cross-cutting` for every resource.

## Out of scope (deferred)

- **Negative keyword log worked example + blank copy** — placeholder
  file ships. Full version lands in the next LEARN-050 PR once the
  worked STR triage and the negative-keyword decision log are
  authored.
- **ACoS / bid calculator worked example + blank copy** — placeholder
  file ships. Full version lands alongside the bid-calculator refresh
  the simulator story work is planning. The companion `automation_tool`
  already exists under `public/downloads/automation-tools/`.
- **PPC account onboarding SOP** — placeholder file ships. Full
  version lands once the SOP is authored with the actual day-one
  workflow.
- **The 4 remaining LEARN-051, LEARN-052, LEARN-053 items** — separate
  follow-ups.

## Operator notes

- Run `pnpm db:seed:learn-050-resources` against production to publish
  the 6 rows. Idempotent — re-running upserts, does not duplicate.
  `--dry-run` shows what would happen without writing.
- The 6 static `.md` files in `public/downloads/job-ready-pack/` are
  served by the existing `/api/resources/[id]/download` route — no new
  route, no new permission tier, no new download handler.
- `cd ../main && pnpm install` after merging picks up the
  `db:seed:learn-050-resources` npm script automatically.

## Verification

- `pnpm typecheck` clean.
- `pnpm lint` 0 errors, 0 new warnings (4 pre-existing Next `<a>`
  warnings in unrelated files).
- `pnpm test:arch` 912/912.
- All resource-related unit tests pass (472/472 across the resource
  entity, use case, and admin page tests).
- All LEARN-050-specific tests pass (75 across the 5 new/extended
  files).
- `pnpm build` clean (deferred to CI).
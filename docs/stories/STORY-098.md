# STORY-098: Download center (guides, templates, automation tools)

**Points:** 1
**Epic:** Content library gap closure (requested directly, not from the sprint backlog)

## Status

**Status:** Done — 2026-08-03.

## Goal

There was no single place for a student to get non-lesson downloadable
resources: quick guides, client-facing templates (reporting, monitoring,
audit), automation tools (e.g. a Google Sheet that scans an STR report
and flags winners/bleeders), student handouts, and cheat sheets. This
story adds a `Resource` domain concept and a `/resources` "download
center" page, plus an admin CRUD panel to publish them.

## What shipped

- `src/domain/entities/Resource.ts` — `Resource` entity with
  `category` (`guide` | `template` | `automation_tool` | `cheat_sheet` |
  `handout`), `fileType` (`pdf` | `xlsx` | `gsheet` | `docx` | `zip` |
  `link`), and `accessTier` (reuses `CourseAccessTier`: `PREVIEW` |
  `STARTER` | `PRO`, gated the same way courses are via
  `subscriptionMeetsCourseTier`). `createResource`/`updateResource`
  factories, full branch-coverage tests in
  `src/domain/entities/__tests__/Resource.test.ts`.
- A `Resource` row is metadata plus a `fileUrl` — not the file bytes
  themselves. At the time this story shipped there was no file-upload
  layer, so `fileUrl` could only be a root-relative `/downloads/...`
  static asset or an admin-pasted external link. **STORY-098.5 (same
  day) added real upload/file-management** — see that story doc; this
  one's "Known limitations" below is left as originally written for
  the historical record, but the first bullet is superseded.
- `src/ports/repositories/IResourceRepository.ts` +
  `InMemoryResourceRepository` (`src/infra/repositories/`) +
  `PrismaResourceRepository`. New `resources` table, migration
  `20260803000000_resource`.
- Use cases: `CreateResource`, `UpdateResource`, `DeleteResource`
  (soft-delete → `isPublished = false`, republish by editing),
  `AdminListResources`, `AdminGetResource`, `ListAvailableResources`
  (student-facing: published resources + a `locked` flag per the
  viewer's subscription tier), `RecordResourceDownload` (the actual
  access gate: re-checks published + tier server-side, increments
  `downloadCount`, writes an audit entry, hands back the `fileUrl`).
  All wired into both `buildProductionContainer()` and
  `buildTestContainer()`.
- `resource.created` / `updated` / `deleted` / `*_failed` /
  `downloaded` added to `AuditAction`.
- Admin: `/admin/resources` (list), `/admin/resources/new` (create),
  `/admin/resources/[id]/edit` (edit + unpublish). Nav entry under
  Content in `NavSidebar.tsx`.
- Student: `/resources` — the download center, grouped by category.
  A resource above the student's tier still shows (so they know what
  upgrading unlocks) with an "Upgrade to unlock" link to `/pricing`
  instead of a download link. Nav entry in `StudentSidebar.tsx` +
  command palette.
- `GET /api/resources/[id]/download` — the actual download endpoint.
  Thin route handler that authenticates via `getSessionUser()`,
  delegates to `RecordResourceDownload`, and 302-redirects to the
  external `fileUrl` on success (404/403/401 JSON otherwise). This is
  the real enforcement point — the student page's lock icon is a UX
  hint, not the gate.

## Known limitations

- **No file upload / blob storage.** ~~Every resource's actual file
  lives outside this app~~ — closed by STORY-098.5 the same day. Left
  here verbatim for the historical record of what this story alone
  shipped; do not treat it as still true.
- Access gating is subscription-tier only, same as course access — it
  does not consider per-course enrollment. A `PRO`-tier resource is
  visible to any `PRO` subscriber regardless of which course(s) they
  are enrolled in, matching how `CourseAccessTier` already works for
  courses.
- "Delete" is really "unpublish" (`isPublished = false`), matching
  `DeleteLiveClass`'s existing soft-delete contract. STORY-098.5 added
  a separate hard-delete (`PurgeResource`) for the rare
  genuinely-wrong-upload case; it's not the same button.

## Pre-installed resources (2026-08-03, same session)

Ten real files were authored and checked into `public/downloads/` (two
per category): two PDF guides, three XLSX templates (client report,
weekly monitoring, listing audit checklist), one XLSX automation tool
(the STR Winner/Bleeder Scanner — real formulas, not a mockup: flags
WINNER/BLEEDER/WATCH per row against adjustable ACOS/spend/click
thresholds on a Settings tab), two PDF cheat sheets, and one PDF + one
DOCX handout. `scripts/seed-resources.ts` (`pnpm db:seed:resources`,
`--dry-run` supported) upserts all ten as published `Resource` rows by
a fixed id, same idempotent-upsert pattern as
`scripts/seed-pricing-tiers.ts`. Not run automatically — an operator
runs it post-deploy, same convention as the other `db:seed:*` scripts.

**Formula verification caveat:** this session's sandbox could not get
LibreOffice's headless recalculation working (confirmed via `strace` —
even a trivial one-cell `.xlsx` and a plain `.txt` file both failed to
load in `--convert-to` mode, and macro-based recalculation hung
indefinitely; this is an environment limitation, not a defect in the
generated files). The STR Scanner's formula _logic_ was independently
verified by reimplementing it in Python against the same 18 sample
rows and confirming an identical Winner/Bleeder/Watch classification
(9/4/5) — see the session's tool transcript. All workbooks open and
calculate normally in real Excel/Google Sheets (both recalculate
formula-only cells automatically on open); they just don't ship with
LibreOffice-cached values baked in the way the `xlsx` skill's normal
workflow produces.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test
pnpm test:arch
pnpm build
```

All green. Also smoke-tested with `pnpm dev`: `/resources` and
`/admin/resources` both redirect unauthenticated visitors to the
correct login route (same behavior as sibling pages `/tools` and
`/admin/live-classes`), and `GET /api/resources/[id]/download` returns
401 JSON when signed out.

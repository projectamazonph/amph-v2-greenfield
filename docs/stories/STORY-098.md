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
- **No file-storage/blob layer exists in this codebase.** A `Resource`
  row is metadata plus an externally-hosted `fileUrl` (a Google
  Drive/Sheets share link, or any public asset URL) — not the file
  bytes themselves. Building real upload/blob storage was explicitly
  out of scope for this pass; see "Known limitations" below.
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

- **No file upload / blob storage.** Every resource's actual file
  lives outside this app (Google Drive/Sheets or similar); the admin
  panel only stores a link. If a hosted upload flow is wanted later
  (e.g. `@vercel/blob`), that's a real follow-up — deliberately not
  built here to avoid taking on a new storage dependency in the same
  pass as the CRUD/access-gating plumbing.
- Access gating is subscription-tier only, same as course access — it
  does not consider per-course enrollment. A `PRO`-tier resource is
  visible to any `PRO` subscriber regardless of which course(s) they
  are enrolled in, matching how `CourseAccessTier` already works for
  courses.
- "Delete" is really "unpublish" (`isPublished = false`); there is no
  hard delete, matching `DeleteLiveClass`'s existing soft-delete
  contract.

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

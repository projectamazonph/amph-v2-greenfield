# STORY-095: Admin email-template editor page

**Points:** 1
**Epic:** Student-facing gap closure (recommended by `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`)

## Status

**Status:** Done, with a stated caveat — 2026-08-02, production-readiness fix session.

## Goal

STORY-063 (Sprint 13) shipped the `EmailTemplate` domain entity, `IEmailTemplateRepository`
port, and both `Prisma`/`InMemory` adapters. PR #256 (2026-07-31) then deleted the three
use cases (`ListEmailTemplates`, `GetEmailTemplate`, `UpdateEmailTemplate`) as "dead code"
because nothing called them and no page existed — a reasonable call at the time, since a
disconnected use case with no caller genuinely is dead code. This story rebuilds them, this
time with actual container wiring and pages, closing the loop.

## What shipped

- `src/usecases/ListEmailTemplates.ts` — returns all 7 known `EmailTemplateType` values in
  fixed order, each paired with its DB row or `null` if never customized.
- `src/usecases/GetEmailTemplate.ts` — fetch one type's current content (`null` template if
  uncustomized, this is not an error).
- `src/usecases/UpdateEmailTemplate.ts` — upsert-by-type: creates a row if none exists,
  patches if one does, via the existing `createEmailTemplate`/`updateEmailTemplate` domain
  factories. Writes an `email_template.updated` audit log entry (the `AuditAction` enum
  value already existed, unused, before this story).
- Wired into both `buildContainer()` and `buildTestContainer()` (`emailTemplateRepo` +
  the three use cases).
- `src/app/actions/updateEmailTemplate.action.ts` — thin server action.
- `/admin/email-templates` — list page (all 7 types, customized/not-customized status,
  no search/filter/pagination since it's a fixed 7-row set, not a growing table).
- `/admin/email-templates/[type]/edit` — upsert form (subject, headline, intro body, CTA
  label), works whether or not a row exists yet.
- Nav link added to `NavSidebar.tsx` under "Content".
- Tests: `src/usecases/__tests__/{ListEmailTemplates,GetEmailTemplate,UpdateEmailTemplate}.test.ts`.

## Known limitation — stated on the page itself

**The actual email-sending renderers (`src/infra/email/templates/*.tsx`) do not read from
this repository.** Editing a template through this admin page does not change what Resend
actually sends to students — the renderers still use their own hardcoded copy. Wiring the
7 renderers (and the subject-line call sites, which live outside the renderer components)
to consult `IEmailTemplateRepository` with a fallback to current hardcoded defaults is a
real follow-up (call it STORY-095.5), deliberately not attempted in this story: the
renderers cover revenue-critical transactional email (receipts, verification codes) with
existing test coverage pinning exact copy, and touching all 7 in the same session as three
other features was judged too much blast radius for the value. The edit page's own copy
tells the admin this explicitly rather than silently shipping a no-op editor.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run src/usecases/__tests__/ListEmailTemplates.test.ts src/usecases/__tests__/GetEmailTemplate.test.ts src/usecases/__tests__/UpdateEmailTemplate.test.ts
pnpm lint
```

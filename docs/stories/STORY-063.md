# STORY-063: Admin email templates

**Sprint:** 13
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-045 (email templates exist as React components)
**Blocks:** none

## Status

- **Story**: STORY-063
- **Sprint**: 13
- **Points**: 1
- **Status:** ⏳ Planned

## Goal

Let admins view and edit the content of transactional email templates (subject line, headline, intro body) via the admin panel, without touching code. Changes take effect immediately — no redeploy needed.

After this story:

- `/admin/settings/email-templates` — list of template types with current status
- `/admin/settings/email-templates/[type]/edit` — edit form + live preview
- `EmailTemplate` domain entity + port + Prisma adapter
- `ListEmailTemplates` use case
- `GetEmailTemplate` use case
- `UpdateEmailTemplate` use case
- Audit log entries for every template save

## Why

Email templates live as hardcoded React Email components today (`RefundEmail`, `ReceiptEmail`, etc.). To change a subject line or a paragraph of copy, you need a developer and a deploy. This story moves the editable content out of code and into the DB, so the admin can iterate on copy without touching the codebase.

## Design decision: what is editable vs. what is locked

Templates have two layers:

1. **Structure** (locked) — the React Email component that defines layout, typography, colors, CTA button styling. This lives in `src/infra/email/templates/`. Changing it requires a developer. Not editable via this story.
2. **Content** (editable) — the subject, headline, intro paragraph, and CTA label. These come from the DB and override the hardcoded defaults.

The email renderer fetches from the DB at render time. If no DB record exists for a template type, it falls back to the hardcoded React component's defaults. This keeps the migration path simple — no data migration needed, templates are opt-in.

## Scope decisions

- **No full template editor** — no MDX/JSX string editing. Only structured fields: `subject`, `headline`, `introBody`, `ctaLabel`. The React Email layout and component tree is never editable.
- **No template creation or deletion** — only the 7 known template types exist. New types require a developer to add a new React Email component.
- **Preview uses server-side render** — render the React Email component to an HTML string server-side, serve it as a data URL in an iframe. No client-side JSX eval.
- **No per-user template overrides** — this is for global template content only.

## Acceptance Criteria

### Domain (NEW)

- [ ] `src/domain/entities/EmailTemplate.ts`:
  - `EmailTemplate` interface: `{ id, type: EmailTemplateType, subject, headline, introBody, ctaLabel, updatedAt, updatedById }`
  - `EmailTemplateType`: string union of known template types: `"email_verification" | "password_reset" | "welcome" | "receipt" | "refund" | "certificate" | "live_class_reminder"`
  - `createEmailTemplate(params)` factory — validates required fields
  - `updateEmailTemplate(template, patch)` — returns new instance

### Port (NEW)

- [ ] `src/ports/repositories/IEmailTemplateRepository.ts`:
  - `listAll(): Promise<Result<readonly EmailTemplate[], EmailTemplateError>>`
  - `findByType(type: EmailTemplateType): Promise<Result<EmailTemplate | null, EmailTemplateError>>`
  - `upsert(template: EmailTemplate): Promise<Result<void, EmailTemplateError>>`
  - `EmailTemplateError`: `db_error`

### Prisma schema

- [ ] Add `EmailTemplate` model to `prisma/schema.prisma`:
  ```
  model EmailTemplate {
    id         String   @id @default(cuid())
    type       String   @unique  // EmailTemplateType
    subject    String
    headline   String
    introBody  String
    ctaLabel   String
    updatedAt  DateTime @updatedAt
    updatedById String
  }
  ```
- [ ] New migration: `prisma/migrations/YYYYMMDDHHMMSS_email_template/`

### Infra

- [ ] `src/infra/repositories/InMemoryEmailTemplateRepository.ts` — implements `IEmailTemplateRepository`
- [ ] `src/infra/repositories/PrismaEmailTemplateRepository.ts` — implements `IEmailTemplateRepository`
  - `upsert` uses `create` + `update` via `upsert` Prisma method
  - Map Prisma row to domain `EmailTemplate` via `createEmailTemplate()`

### Use cases (TDD)

- [ ] `ListEmailTemplates`:
  - Input: `{}`
  - Output: `{ templates: readonly EmailTemplate[] }`
  - Returns all 7 templates (with DB values if they exist, falls back to hardcoded defaults for the domain entity — but the repo only returns what's in the DB)

- [ ] `GetEmailTemplate`:
  - Input: `{ type: EmailTemplateType }`
  - Output: `{ template: EmailTemplate }`
  - Returns DB record if it exists, otherwise `not_found`

- [ ] `UpdateEmailTemplate`:
  - Input: `{ type: EmailTemplateType, subject, headline, introBody, ctaLabel, actorId: string }`
  - Validates all fields are non-empty
  - Calls `upsert` on the repo
  - Records `email_template.updated` audit log entry

### Tests

- [ ] `src/domain/entities/__tests__/EmailTemplate.test.ts`
- [ ] `src/usecases/__tests__/ListEmailTemplates.test.ts`
- [ ] `src/usecases/__tests__/GetEmailTemplate.test.ts`
- [ ] `src/usecases/__tests__/UpdateEmailTemplate.test.ts`
- [ ] `src/infra/repositories/__tests__/InMemoryEmailTemplateRepository.test.ts`
- [ ] `src/infra/repositories/__tests__/PrismaEmailTemplateRepository.test.ts`

### Server actions

- [ ] `listEmailTemplatesAction` — `{}` → `{ templates }`
- [ ] `getEmailTemplateAction` — `{ type }` → `{ template }`
- [ ] `updateEmailTemplateAction` — `{ type, subject, headline, introBody, ctaLabel }` → `{ template }` (actorId from session)

### Pages

- [ ] `/admin/settings/email-templates/page.tsx`:
  - Heading: "Email Templates"
  - Table: `Type`, `Subject`, `Last Updated`
  - Row click → edit page

- [ ] `/admin/settings/email-templates/[type]/edit/page.tsx`:
  - Heading: `<Type>` template (human-readable)
  - Left panel: form fields
    - `Subject` — text input
    - `Headline` — text input
    - `Intro Body` — textarea
    - `CTA Label` — text input
  - Right panel: live preview
    - Server component that renders the React Email template with the form values passed as props
    - Updates on blur (optimistic, no auto-save)
    - "Save" button — calls `updateEmailTemplateAction`
  - Success toast on save

### Route handler (preview)

- [ ] `POST /admin/api/email-templates/preview/route.ts`:
  - Accepts `{ type, subject, headline, introBody, ctaLabel }`
  - Calls the corresponding React Email component with those props
  - Renders to HTML via `@react-email/render`
  - Returns `{ html: string }`
  - Used by the preview panel to fetch rendered HTML on field blur

### Container

- [ ] `AppContainer`: add `listEmailTemplates`, `getEmailTemplate`, `updateEmailTemplate`
- [ ] `TestContainer`: same

### Seed

- [ ] `scripts/seed-email-templates.ts`: creates DB records for all 7 template types with their current hardcoded values as defaults. Run once after migration to seed the DB.

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `pnpm prisma migrate dev` (or deploy)
- [ ] `vitest run` — existing tests + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/domain/entities/EmailTemplate.ts
src/domain/entities/__tests__/EmailTemplate.test.ts
src/ports/repositories/IEmailTemplateRepository.ts
src/infra/repositories/InMemoryEmailTemplateRepository.ts
src/infra/repositories/PrismaEmailTemplateRepository.ts
src/infra/repositories/__tests__/InMemoryEmailTemplateRepository.test.ts
src/infra/repositories/__tests__/PrismaEmailTemplateRepository.test.ts
src/usecases/ListEmailTemplates.ts
src/usecases/GetEmailTemplate.ts
src/usecases/UpdateEmailTemplate.ts
src/usecases/__tests__/ListEmailTemplates.test.ts
src/usecases/__tests__/GetEmailTemplate.test.ts
src/usecases/__tests__/UpdateEmailTemplate.test.ts
src/app/actions/listEmailTemplates.action.ts
src/app/actions/getEmailTemplate.action.ts
src/app/actions/updateEmailTemplate.action.ts
src/app/admin/settings/email-templates/page.tsx
src/app/admin/settings/email-templates/[type]/edit/page.tsx
scripts/seed-email-templates.ts
prisma/migrations/YYYYMMDDHHMMSS_email_template/migration.sql
```

## Files to Modify

- `prisma/schema.prisma` — add `EmailTemplate` model
- `src/composition/container.ts` — wire 3 new use cases
- `src/composition/container.test.ts` — same

## Pitfalls

- **Preview rendering must be server-side only** — the preview iframe fetches from a server route handler that renders React Email to HTML. Never `eval()` or `new Function()` on the client.
- **Upsert handles both create and update** — `upsert` on the repo maps to Prisma's `upsert` method. If the row doesn't exist, create it; if it does, update it.
- **Audit log on every save** — `UpdateEmailTemplate` calls `recordAuditLog` with action `email_template.updated`.
- **React Email components need the right props** — each template component has its own prop shape. The preview handler needs a switch on `type` to call the right component with the right props.
- **Template type enum** — define `EmailTemplateType` as a string union in the domain entity. Don't use a Prisma enum (match the existing pattern for lifecycle status fields in this schema).

## Verification

```bash
pnpm tsc --noEmit
pnpm prisma migrate dev
pnpm vitest run
pnpm build
```

Manual smoke:

- Sign in as admin
- Visit `/admin/settings/email-templates` — see the 7 template types
- Click a template → see form with current values
- Edit a field → preview updates
- Save → success toast, DB updated
- Visit `/admin/settings/email-templates` → last updated timestamp updated

## Out of scope

- **Template structure editing** — MDX/JSX string editing
- **New template types** — require developer + new React Email component
- **Template deletion** — templates always exist
- **Per-user template overrides** — global templates only
- **Email template preview on the list page** — preview is on the edit page only
- **A/B testing** — no variant management
- **Scheduled sends** — not part of template editing

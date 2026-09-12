# P1-05 — Site settings (PR-C slice 3)

**Status:** Implemented — merged on `main`. Entity (`Setting`), port (`ISettingRepository`), Prisma + InMemory adapters, three use cases (`GetSetting`, `SetSetting`, `ListSettings`), server action (`setting.action.ts`), admin form at `/admin/settings` (`SiteSettingsForm.tsx`), and `/maintenance` page consumer all ship. See `CHANGELOG.md` for confirmation.

## Scope

Admin-editable key/value store on the `Setting` model, surfaced as a
new Site settings card on `/admin/settings`.

- Domain `Setting` entity: key format (`lowercase.letters_digits`),
  JSON-serializable value gate, 100 percent branch coverage.
- Port `ISettingRepository` plus InMemory and Prisma adapters.
- `GetSetting` (value or caller default), `SetSetting` (admin
  upsert, audited as `setting.saved` / `setting.save_failed`),
  `ListSettings` (admin read).
- Server action with JSON parse errors mapped to plain copy.
- First consumer: the 503 `/maintenance` page reads
  `support_email` best-effort and keeps its hardcoded fallback.
  Best-effort is deliberate: that page must render during a
  database outage, so a lookup failure falls back instead of
  failing the page.
- No new migration: the W0-01 `settings` table already carries
  every column including audit fields.

## Out of scope

- P1-03 resource polish, P1-06 email templates (other PR-C
  slices), PR-D OAuth.
- Setting deletion (no UI, no use case; rows stay).
- Typed per-key validation. Values are opaque JSON; each consumer
  narrows and falls back.

## Verification

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` green.
- New suites: Setting entity, InMemorySettingRepository, all three
  use cases, the server action, the maintenance fallback render.

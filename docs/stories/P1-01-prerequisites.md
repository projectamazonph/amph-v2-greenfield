# P1-01 — Course prerequisites (PR-C slice 1)

**Status:** Implemented — merged on `main`. Migration `20261009020000_p1_01_prerequisite_audit_fields` adds `createdById`/`updatedById` to `prerequisites`. Entity (`Prerequisite`), port (`IPrerequisiteRepository`), Prisma + InMemory adapters, `SetCoursePrerequisite` and `RemoveCoursePrerequisite` use cases, `prerequisite.action.ts`, admin page at `/admin/courses/[id]/prerequisites`, and `EnrollStudent` prerequisite gate all ship. See `FEATURES.md` and `CHANGELOG.md` for confirmation.

## Scope

Explicit DB-backed course gating on the `Prerequisite` model
(`courseId` requires `requiresCourseId`, optionally a single
`requiresLessonId`). This is separate from the existing implicit
sequential lesson order in `GuidedFlow`, which stays untouched.

- Domain `Prerequisite` entity: create validation (no blank ids, no
  self-require), pure satisfaction helpers, 100 percent branch coverage.
- Port `IPrerequisiteRepository` plus InMemory and Prisma adapters.
- `SetCoursePrerequisite` and `RemoveCoursePrerequisite` (admin only,
  audited as `prerequisite.set` / `prerequisite.removed`). Set validates
  both courses exist and rejects dependency cycles.
- `EnrollStudent` gates enrollment on satisfied prerequisites for every
  entitlement except `admin_grant` (deliberate admin override, already
  audited as `enrollment.granted`). New error `prerequisite_not_met`.
- Course page shows the requirement before purchase. Admin course edit
  page manages the list.
- Migration adds the missing `createdById` / `updatedById` audit columns
  to `prerequisites` (every mutable table needs them, no exceptions).

## Out of scope

- P1-02 assignments, P1-03 resource polish, P1-05 settings, P1-06 email
  templates (other PR-C slices), PR-D OAuth.
- `announcement.*` audit actions missing from `ALL_ACTIONS` (noticed
  while adding prerequisite actions, left alone to keep one concern per
  commit).

## Verification

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` green.
- New suites: Prerequisite entity, InMemoryPrerequisiteRepository,
  Set/RemoveCoursePrerequisite, EnrollStudent prerequisite gate.

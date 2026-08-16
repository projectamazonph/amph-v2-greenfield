# STORY-112: Persist planned learner time for every lesson

**Sprint:** Learning experience uplift, wave 0

**Points:** 5

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress. Planned-duration persistence is implemented on the dedicated branch.

## Goal

Make the time a beginner should budget visible and consistent for text, video,
and quiz lessons. The catalog, course detail, lesson header, and sidebar must
read one persisted value instead of guessing from media type or word count.

## Scope

- Add `Lesson.plannedMinutes` with a safe legacy default and a Prisma migration.
- Persist and hydrate the value through the lesson repository and lesson update path.
- Use the value for catalog totals, module totals, course detail rows, lesson headers,
  and lesson navigation metadata.
- Preserve video `content.durationMinutes` as media metadata; it is not the learner-time contract.
- Backfill existing video rows from their stored media duration while leaving old text/quiz rows at
  zero until their source content is imported again.

## Acceptance criteria

- A text lesson created with `plannedMinutes: 12` round-trips through the repository.
- Catalog and course-detail totals include planned minutes for every lesson type.
- A lesson header and sidebar show the same planned value as the catalog.
- Invalid planned durations (negative or fractional) are rejected.
- Existing video lessons keep their media duration and remain readable after migration.

## Verification

- Focused domain, catalog, and Prisma adapter tests cover persistence, validation, aggregation,
  and backward-compatible video defaults.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are required in CI.

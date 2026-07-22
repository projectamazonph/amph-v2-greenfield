# Sprint 3 — Course Catalog + Content Import (5 pts)

**Date:** 2026-07-22 (picking up from post-merge `main`; STORY-021,
STORY-010, all P0-2 fixes, and the E2E suite are already done — see
`SESSION-HANDOVER.md` "Project Status" for the current baseline)
**Owner:** Ryan Roland Dabao
**Sprint goal:** Lay the persistence + content surface for the public
catalog: `PricingTier` model (the actual missing piece from STORY-011),
MDX content renderer, content import script, RSC catalog + course detail
pages, and a pricing page that surfaces the all-access pass + early-bird
logic.

---

## What's already done (not on this sprint)

To make sprint planning honest: when STORY-011 was written, `Course`,
`Module`, `Lesson` models + their `*Repository` ports + their
`*Memory*`/`Prisma*` adapters + their admin use cases + their admin UI
ALL shipped in earlier work (PR #129 closed the last two legs of P0-2
for `moduleRepo` and `lessonRepo`). The only thing STORY-011 still
needed was the `PricingTier` model. So this sprint is really four
stories, not five — but five is the right number of vertical slices for
"catalog + content." Sizing is per-story, not per-sprint, so the
velocity effect is real (4 pts of work for a 5-pt sprint).

| Story                        | What ships                                           | Why it's already done                                                  | Where   |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | ------- |
| STORY-011 (PricingTier only) | `PricingTier` Prisma model + port + adapters + tests | Only the `PricingTier` model was missing from STORY-011's listed scope | This PR |

## Stories in this sprint

| ID        | Title                                                             | Pts | What it does                                                                                                                                          |
| --------- | ----------------------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| STORY-011 | Course + Module + Lesson + PricingTier models + repos             | 1   | Adds the `PricingTier` model + port + adapters + tests. `Course`/`Module`/`Lesson` already shipped in main.                                           |
| STORY-012 | MDX content renderer port + adapter                               | 1   | `IMdxContentRenderer` port + a `compileMdx` adapter that turns `.mdx` files into React Server Components. Caches compiled output.                     |
| STORY-013 | Content import script (`scripts/import-amph-content.ts`)          | 1   | Reads from `content/curriculum/`, upserts `Module`/`Lesson` rows per course. Idempotent. Runnable via `pnpm content:import`.                          |
| STORY-014 | RSC catalog page (`/courses`) + course detail page                | 1   | Public-facing list + detail. Uses `ListCourses` + `GetCourse` use cases. Renders `curriculum` outline + a "Buy" CTA wired into `CreatePaymentIntent`. |
| STORY-015 | Pricing page (`/pricing`) with all-access pass + early-bird logic | 1   | Lists active `PricingTier` rows. Adds the `Course.pricingTierId` FK + backfill. Implements early-bird (time-windowed price override per tier).        |

## Architecture decisions (already locked in)

- `PricingTier` follows the same `status` (`DRAFT` / `ACTIVE` /
  `ARCHIVED`) soft-delete convention as `Course` and `LiveClass`, not
  the `archivedAt` column pattern used by `DiscountCode` and
  `SimulatorScenario`. Rationale: `Course` and `LiveClass` are the
  precedent for "lifecycle with a public status" — pricing tiers
  surface in the catalog like courses do, and the public pricing page
  needs to filter on `status === "ACTIVE"`.
- The `Course.pricingTierId` FK migration (STORY-015) is a breaking
  change. It requires a backfill script (assign every existing course
  to a default "foundations" tier) and a snapshot-on-order pattern
  (orders carry the tier's price, not a re-lookup). The backfill
  belongs to STORY-015, not here.
- MDX content lives in `content/curriculum/<course-slug>/module-N-*.mdx`
  and is loaded at request time by the lesson page, not at build time
  by the import script. The import script only records the row in the
  `lessons` table; the actual `mdxPath` field is read by the lesson
  page (STORY-026) at render time.
- `Lesson.content` in the Prisma schema is `Json` and stores the
  lesson's type-specific payload (`{ durationMinutes, videoUrl }` for
  VIDEO, `{ body }` for TEXT, etc.). The import script writes this
  field; the lesson page (STORY-026) reads it.
- The `PrismaCourseRepository` already has a known-limitation comment
  in its file header: it hardcodes `courseTier: "STARTER"` and
  `previewLessonCount: 1` because the live `Course` Prisma model has
  no columns for them. STORY-015 (which adds the pricing-tier FK) is
  the right place to also add the `courseTier` column; otherwise
  the hardcode stands.

## What this sprint does NOT cover

- The lesson page itself (renders one lesson) is STORY-026 (Sprint 6).
  The catalog page (renders the course + its curriculum outline) is
  STORY-014, and is the last catalog story in this sprint.
- The admin curriculum editor (drag-and-drop module reorder, lesson
  reorder, MDX editor) already shipped in STORY-048b/c (Sprint 10).
  This sprint's content import is a one-shot script, not an
  end-to-end editor.
- Multi-currency support. PHP is the only currency; the schema's
  `currency: String @default("PHP")` is hardcoded everywhere.

## Definition of Done (per story)

- [ ] Code: the listed files are created or modified, per the story's "Code shape" section.
- [ ] Tests: unit tests for domain functions, use-case tests with `buildTestContainer()`, integration test for the new adapter if applicable.
- [ ] Lint: `pnpm lint` passes (boundary rules, voice, no-ai-slop).
- [ ] Typecheck: `pnpm tsc --noEmit` passes.
- [ ] Architecture: `pnpm test:arch` passes.
- [ ] Build: `pnpm build` succeeds.
- [ ] Conventional commit: `feat(<area>): <title> (STORY-XXX)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.

## Sprint close checklist

- [ ] All 5 stories merged.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:arch && pnpm build` all green.
- [ ] `docs/sprint-4/PLAN.md` exists.
- [ ] `SESSION-HANDOVER.md` updated with the closing notes.
- [ ] Demo: spin up `pnpm dev`, hit `/courses`, see the seed catalog (after STORY-013/014 land), click into a course, see the curriculum outline.

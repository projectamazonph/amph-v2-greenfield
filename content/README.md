# Content — Curriculum Source

This directory holds the curriculum content (lesson MDX files and quiz fixture) for the AMPH Academy platform. It is the **source of truth** that the future `scripts/import-amph-content.ts` (Sprint 3 / STORY-013) will read from to populate the database.

## Layout

```
content/
├── README.md                      # this file
└── curriculum/
    ├── modules/                   # 31 lesson MDX files across 9 modules
    │   ├── 0-onboarding/          # 3 lessons: welcome, platform tour, first sim
    │   ├── 1-foundations/         # 5 lessons: what is PPC, CPC/CTR, ACoS/TACoS, ROAS, metrics in practice
    │   ├── 2-keyword-research/    # 4 lessons: match types, workflow, negatives, grouping
    │   ├── 3-listing-optimization/# 3 lessons: listing quality, anatomy, A+ content
    │   ├── 4-campaign-architecture/  # 4 lessons: SP, SB/SD, structure, practice
    │   ├── 5-portfolio-strategy/  # 3 lessons: portfolios, budget pacing, seasonal
    │   ├── 6-bidding-lab/         # 3 lessons: bid strategies, placement, bid-elevator prep
    │   ├── 7-search-term-triage/  # 3 lessons: search-term analysis, negatives, STR triage prep
    │   └── 8-competitive-intelligence/  # 3 lessons: brand analytics, share-of-voice, benchmarking
    └── quiz-questions.json        # 7 module-final quizzes (knowledge checks)
```

## Source & history

The content was **migrated from the original `amph-v2` repo** (`content/curriculum/`) on 2026-07-18 as pre-flight prep for the future Sprint 3 / STORY-013 work.

**Upstream chain:**

1. Original v1 platform `projectamazonph/AMPH-Academy` (frozen, public) authored the raw lessons in `project/content/modules/`.
2. The original `amph-v2` repo copied them to its `content/curriculum/modules/`, then ran a **content track** (2026-07-15/16, see parent `SESSION-HANDOVER.md`) that:
   - Stripped legacy product references: **AdCraft**, **AI Mentor**, **Formula Calculator**, "STR Triage Arena", and the "three simulations" framing — none of which exist in v2.
   - Replaced them with the real v2 platform: Project Amazon PH Academy, the actual 4-tab bottom nav (Home/Courses/Tools/Profile), and the five real tools from the engine registry.
   - Added 5 factual corrections (portfolios, attribution, auction, listing quality score, dayparting) with Amazon Ads Fact Cards (source URL + scope + owner/date placeholders).
   - Split the curriculum into two Course rows (`ppc-foundations` = modules 0–4, `accelerated-mastery` = modules 5–8) so both tiers have a course. `ultimate-transformation` deliberately has no course — its modules (10–13) don't exist yet (Release 3).
3. **This greenfield repo** now carries forward that scrubbed + corrected version, byte-for-byte.

**What you see in these files is the post-content-track version, not the raw v1.** No additional edits were made during the migration.

## Where the content comes from (per file)

| Path in this repo | Source commit in `projectamazonph/amph-v2` |
|---|---|
| `content/curriculum/modules/*` | scrubbed + fact-card-augmented content, fetched 2026-07-18 |
| `content/curriculum/quiz-questions.json` | original v1 `project/fixtures/quiz-questions.json` (unchanged — quiz text was never the legacy problem) |

## Why migrate now, before STORY-013?

The greenfield is currently at **Sprint 9 done** (certificates + email), with Sprint 10 (admin panel) next. The curriculum import story — **STORY-013** (`Content import script (scripts/import-amph-content.ts) reading from content/curriculum/)** — is in Sprint 3 of the greenfield's `sprint-plan.md`, and hasn't been built yet.

**Migrating the content now means:**

1. When the greenfield catches up to Sprint 3 (either by re-running the skipped sprints or by back-filling just STORY-013), the source is already in place — no extra fetch step.
2. The content has already been **scrubbed of the dead-product references** that would otherwise require the same content-track pass the parent already did. That's a meaningful 2-day saving.
3. The future `import-amph-content.ts` has a fixed path to read from (`content/curriculum/`), so it can be written and tested without a separate "fetch content from v1" step.

## What the future `import-amph-content.ts` will do

It will:

1. Read every `*.mdx` file under `content/curriculum/modules/<module-slug>/<lesson-slug>.mdx`.
2. Parse the frontmatter (`title`, `slug`, `moduleNumber`, `lessonNumber`, `type`, `estimatedMinutes`, `xpReward`).
3. Upsert `Module` and `Lesson` rows in the `Course` bound to `ppc-foundations` tier (modules 0–4) and `accelerated-mastery` tier (modules 5–8).
4. Read `content/curriculum/quiz-questions.json`, parse the 7 quizzes, and attach each to the appropriate module's final lesson as a knowledge check.
5. Be idempotent (re-running should not duplicate rows — use slug as natural key).

The greenfield's future import script will be modeled on the parent's, but:

- Will resolve paths via `import.meta.url` (repo-relative), not the hard-coded device path the parent once had.
- Will use the existing `JoseJwtService` and the SOLID five-layer architecture (the parent did not have the SOLID architecture, so its import script is a one-off CLI tool — the greenfield's can be cleaner).
- Will not regenerate slugs for modules 5–8 from `amph-foundations-*` to `accelerated-mastery-*` (the parent's pass did this; the greenfield's content is already on the post-split slugs since this whole folder was copied after the split).

## Content audit & corrections (carried forward from parent)

The content in this folder has already been audited and corrected. The parent's `docs/CONTENT-AUDIT-2026-07-16.md` and `docs/CONTENT-UPDATE-PLAN.md` document the corrections. If the greenfield later needs to apply the same corrections (e.g., the parent releases a new audit pass), re-read those parent docs first.

**Specific corrections that were already applied (and are in the files in this folder):**

1. **5.1 Portfolios** — removed the claim that portfolios carry shared negative keywords / bid adjustments. They don't; those are campaign-level.
2. **7.1 Attribution** — removed the fixed "7-day SP / 14-day SB" claim. Taught as an account-level setting to verify, not a constant.
3. **6.1 Auction** — removed the "modified second-price, pay $0.01 above next bid" mechanic. Reframed around bid ceiling + monitoring realized CPC.
4. **3.1 + 4 cross-references (3.2, 3.3, 1.2-cpc-ctr.mdx, 8.2-share-of-voice.mdx)** — "Listing Quality Score" reframed as "listing and ad relevance signals" (a teaching shorthand, not a real, inspectable Amazon metric). Underlying factor table (CTR, CVR, completeness, reviews, price, stock) kept — those are genuinely observable.
5. **5.2 + 8.2/8.3 dayparting** — qualified as "where eligible" with a console-validation step and a manual fallback.

Each fix added an Amazon Ads Fact Card (source URL, scope, owner/date placeholders for the content owner to fill in — not fabricated).

## What was explicitly NOT done during the migration

- **No additional content rewrites** beyond the parent's content track. The greenfield content here is byte-identical to the parent's `content/curriculum/`.
- **No slugs renamed.** Even where a lesson's framing changed (e.g., `3.1-listing-quality-score.mdx`, `0.3-first-simulation.mdx`), only the frontmatter `title` field was updated, not the filename. Renaming the slug would break `Lesson.slug`-keyed upserts.
- **No lesson-production standard pass.** The 10-block lesson format (client outcome, decision card, worked case, etc.) from the parent's `docs/CURRICULUM-REDESIGN.md` is a Release 2 scope; the lessons here are not all on that format yet. That's a separate content-track pass for later.
- **The import script was not run** — no `DATABASE_URL` was available; no row was written; the future `scripts/import-amph-content.ts` will be the first to actually load this content into the database.

## Verification

```bash
# All 31 MDX files are present
find content/curriculum/modules -name "*.mdx" | wc -l   # 31

# Quiz JSON is parseable
python3 -c "import json; json.load(open('content/curriculum/quiz-questions.json'))"

# No legacy product references survive
grep -rE "AdCraft|AI Mentor|Formula Calculator" content/  # (no output)

# All 9 modules present
ls content/curriculum/modules/   # 0-onboarding ... 8-competitive-intelligence
```

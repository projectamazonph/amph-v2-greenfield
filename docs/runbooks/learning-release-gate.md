# Learning release gate

**Severity:** Release control
**Owner:** Content owner + release operator
**Last reviewed:** 2026-08-16

Use this gate when curriculum MDX, lesson metadata, imported resources, or
public learning claims change. The steps are intentionally ordered: source
validation, database import, public-claim validation, and a logged-in learner
smoke must produce evidence before the production promotion.

## 1. Validate the source contract

Run from the exact commit being released:

```bash
pnpm validate:curriculum
pnpm exec vitest run src/domain/curriculum/__tests__/PublicCurriculumClaims.test.ts
```

Record the commit SHA, lesson count, planned-minute total, and the command
output. A failure means the release stops; do not import partial content.

## 2. Import into staging

Against the disposable or staging database only:

```bash
SHADOW_DATABASE_URL= pnpm prisma:deploy
pnpm import:content
```

Record the importer summary and the resulting published course/module/lesson
counts. Importing is a separate operation from changing public claims; do not
edit `public-claims.json` as part of an import retry.

## 3. Validate the public promise

Run the release contract again after the import:

```bash
pnpm validate:learning-release
```

Confirm that the landing page, tier cards, planned time, simulator availability,
and certificate wording match the reviewed claim config. Attach the output to
the release record.

## 4. Run the logged-in learner smoke

With the staging URL and disposable student account, run the existing journey
suite:

```bash
BASE_URL=https://<staging-host> pnpm test:e2e -- tests/e2e/critical-journeys.spec.ts
BASE_URL=https://<staging-host> pnpm test:e2e -- tests/e2e/simulator-access.spec.ts
```

The smoke must show signup → dashboard → course/lesson access and one simulator
attempt. Record the URL, student fixture identifier (never a password), test
report link, and timestamp. A public-only check is not sufficient evidence.

## 5. Promote only after all evidence exists

The release operator signs off the following checklist:

| Evidence | Recorded value |
| --- | --- |
| Commit SHA |  |
| Source contract output |  |
| Staging import output and row counts |  |
| Public-claim validation output |  |
| Logged-in smoke URL/report |  |
| Operator + timestamp |  |

Only after all rows are complete may the production deploy run. If any step
fails, fix or roll back the source/import in staging and restart at step 1.

## CI relationship

The `Learning release gate` CI job runs source inventory and public-claim
validation after the quality, unit, and Playwright jobs pass. CI proves the
checked-in contract; the staging import output and logged-in URL above remain
release evidence that must be attached by the operator.

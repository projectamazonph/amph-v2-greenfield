# Documentation index

**Reviewed:** 2026-09-23 against `main` at `b2e7fe3`

Use this page to distinguish current operating guidance from retained history.

## Current sources of truth

| Need                                    | Document                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Current repository and deployment state | [`../STATE.md`](../STATE.md)                                                                               |
| Feature status                          | [`../FEATURES.md`](../FEATURES.md)                                                                         |
| Operator handoff                        | [`../SESSION-HANDOVER.md`](../SESSION-HANDOVER.md)                                                         |
| Architecture rules                      | [`../AGENTS.md`](../AGENTS.md), [`build-spec.md`](build-spec.md), [`decisions.md`](decisions.md)           |
| Routes and runtime behavior             | [`api-reference.md`](api-reference.md)                                                                     |
| Admin behavior                          | [`admin-backend.md`](admin-backend.md)                                                                     |
| Payments and access                     | [`business-layer.md`](business-layer.md)                                                                   |
| Database                                | [`db-schema.md`](db-schema.md)                                                                             |
| Operations                              | [`runbooks/README.md`](runbooks/README.md), [`DISASTER-RECOVERY-RUNBOOK.md`](DISASTER-RECOVERY-RUNBOOK.md) |
| Delivery history                        | [`../CHANGELOG.md`](../CHANGELOG.md), [`sprint-plan.md`](sprint-plan.md)                                   |
| Learning-experience roadmap             | [`LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`](LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md)                           |

## Current baseline

- Production: <https://projectamazonph.vercel.app>
- Retired origin: `https://amph-v2-greenfield.vercel.app`
- Reviewed commit: `b2e7fe3` (2026-09-23)
- Gate measured on CI at `2691a8d`, the commit before it: 5,208 Vitest tests passed with 3 skipped across
  538 collected files, 892 architecture checks, TypeScript clean, ESLint 0 errors and 3 pre-existing
  warnings, and the production build, Playwright E2E, learning-release gate and Lighthouse jobs green
- The August student-journey fixes (PR #305 to #308, gate then 3,816 tests) are historical; `../STATE.md`
  and `../CHANGELOG.md` carry the current line of work
- Curriculum text does not publish on deploy. `node scripts/seed-all-content.mjs` is the only script that
  writes lesson bodies and the quiz bank, and neither `package.json` nor `vercel.json` runs it

## Historical records

Files under `docs/audits/`, dated audit documents, sprint retrospectives, and older entries in `SESSION-HANDOVER.md` describe the repository at the time they were written. Keep them for traceability. Do not treat an old open finding as current without checking the source and the current documents above.

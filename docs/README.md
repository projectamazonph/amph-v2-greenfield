# Documentation index

**Reviewed:** 2026-08-12 against `main` at `ee1737a`

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
- Reviewed commit: `ee1737a`
- Student repair: PR #305 (`9096cf4`)
- Manual enrollment fix: PR #306 (`9d80c77`)
- Admin redirect cookie fix: PR #307 (`88d83d9`)
- Password-reset URL fix: PR #308 (`ee1737a`)
- Verification: 3,816 Vitest passed, 2 skipped; 665 architecture checks; TypeScript, ESLint, production build, Playwright, and Lighthouse passed

## Historical records

Files under `docs/audits/`, dated audit documents, sprint retrospectives, and older entries in `SESSION-HANDOVER.md` describe the repository at the time they were written. Keep them for traceability. Do not treat an old open finding as current without checking the source and the current documents above.

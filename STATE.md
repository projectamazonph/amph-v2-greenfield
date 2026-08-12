# Current project state

**Project:** Project Amazon PH Academy v2
**Reviewed:** 2026-08-12
**Main:** `ee1737a`

## Production

- Canonical URL: <https://projectamazonph.vercel.app>
- Retired URL: `https://amph-v2-greenfield.vercel.app`
- Framework: Next.js 16, React 19, strict TypeScript, Prisma 7, PostgreSQL
- Database inventory: 36 models, 4 enums, 35 append-only migrations

## Latest merged repairs

| PR   | Commit    | Result                                                                                                                |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| #305 | `9096cf4` | Repaired the student journey, route states, navigation, data export, and accessibility coverage                       |
| #306 | `9d80c77` | Manual paid-tier grants now create the eligible published-course enrollments students need to see courses and lessons |
| #307 | `88d83d9` | Admin login plants the session cookie on the redirect response                                                        |
| #308 | `ee1737a` | Password-reset emails normalize the retired deployment origin to the canonical production URL                         |

Manual grants are idempotent. STARTER grants published STARTER and PREVIEW courses; PRO grants all eligible published courses; FREE creates no enrollment. A new manually granted account receives a password-reset link. The grant does not create an Order row.

## Verified gate

- Vitest: 3,816 passed, 2 skipped
- Architecture: 665 passed
- TypeScript: passed
- ESLint: passed
- Production build: passed
- Playwright: passed
- Lighthouse: passed

## Remaining known limitations

- Simulator scores are formative, not certification or hiring evidence.
- Email-template overrides do not interpolate placeholders. `RefundEmail.ctaLabel` has no rendered button.
- Admin 2FA is opt-in.
- Live backup/restore, payment-webhook rotation, and external uptime checks require operator execution.
- A PayMongo event can be stored as PAID before enrollment fails. Because replay exits early for an already-paid order, use the audited admin tier-grant flow to repair a confirmed-paid partial state.

## Next action

Operate from the canonical production URL, keep runbooks current after operator drills, and verify the relevant quality gates before every merge.

# Current database schema inventory

**Reviewed:** 2026-07-27  
**Source of truth:** `prisma/schema.prisma` and the SQL files under `prisma/migrations/`.  
**Validation:** `pnpm prisma validate` passes.

The old version of this document described an aspirational schema with universal soft-delete columns, audit columns, native state enums, Checkout/Payment/Refund/Receipt tables, RSVP tables, and several fields that are not in the current repository. This file now records the actual model inventory and the important differences. Read `schema.prisma` for the complete field and relation definitions.

## Principles that are true today

- PostgreSQL is the only configured provider.
- Prisma 7 uses `@prisma/adapter-pg`; application code imports the singleton from `src/infra/database/prisma.ts`.
- Primary keys are CUID strings.
- Monetary values are stored as integer minor units where the domain models money.
- The application is single-tenant; there is no organization ID.
- Migrations are append-only and use the PostgreSQL migration lock.

## Actual model inventory

`prisma/schema.prisma` currently defines 35 models (the count below predates STORY-098's `Resource` addition and other 2026-08-02 session changes; re-count from the schema before trusting either number):

1. `User`
2. `Session`
3. `Course`
4. `PricingTier`
5. `Module`
6. `Lesson`
7. `SimulatorScenario`
8. `LiveClass`
9. `Enrollment`
10. `Order`
11. `PpcCampaign`
12. `AuditLog`
13. `WebhookEvent`
14. `EmailLog`
15. `DiscountCode`
16. `XPEvent`
17. `ProgressEvent`
18. `UserStreak`
19. `Quiz`
20. `QuizQuestion`
21. `QuizOption`
22. `QuizAttempt`
23. `QuizAttemptAnswer`
24. `Badge`
25. `BadgeAward`
26. `Certificate`
27. `EmailVerification`
28. `PasswordReset`
29. `SentReminder`
30. `SimulatorAttempt`
31. `SimulatorDecision`
32. `ScorePolicy`
33. `EmailTemplate`
34. `AttemptFeedback`
35. `Resource`

The schema defines four enums: `Role`, `SubscriptionTier`, `VerificationStatus`, and `SimulatorAccess`.

## Important model boundaries

### Identity and access

`User` stores first and last name, password hash, role, verification state, subscription fields, legacy course-access fields, XP, failed-login counters, lockout timestamp, and optional TOTP state. `Session` stores token hashes and expiry, but the current request guard does not consult it when validating a JWT.

### Courses and curriculum

`Course` stores a JSON `curriculum` value and also relates to `Module` rows. `Module` relates to `Lesson` rows. Mutation use cases rebuild the course curriculum JSON after module or lesson writes, but both representations remain in the schema and should be treated as a deliberate compatibility boundary until a future migration chooses one source of truth.

`Lesson.type` and `LiveClass.status` are string columns with application-level validation. `Order.status`, `Order.paymongoStatus`, `Enrollment.status`, and `QuizAttempt.status` are also stored as strings. Enrollment and quiz-attempt repositories validate persisted values on read; they are not native Prisma enums.

### Payments and access

The current schema uses `Order` for checkout and payment state. It does not contain the separate `Checkout`, `Payment`, `Refund`, or `Receipt` models described in the original target design. Confirm the `Order` fields and related course/user relations before writing a payment integration.

`PricingTier` stores base price, lifecycle status, display order, and optional early-bird values. Pricing-tier rows must be seeded before `/pricing` can show cards. Course rows must be published and linked before `/courses` can show catalog cards.

### Simulators and assessment

`SimulatorScenario`, `SimulatorAttempt`, `SimulatorDecision`, `ScorePolicy`, and `AttemptFeedback` support the five registered simulators, including Keyword Research (STORY-081). Keyword Research's `KeywordDataset` is a plain in-code repository (`StaticKeywordDatasetRepository`), not a Prisma model — there is no DB table or admin CRUD for keyword datasets yet.

The simulator scoring configuration has known integrity and subject-matter limitations. Do not use attempt scores for certification or hiring decisions; see `docs/audit-2026-07-26-simulator-accuracy-review.md`.

### Operations

`AuditLog` and `WebhookEvent` provide durable audit and webhook records. `SentReminder` prevents duplicate live-class reminder sends. `EmailTemplate` has repository and use-case support, but no current admin page under `src/app/admin`.

### Download center (STORY-098)

`Resource` (the download-center catalog: guides, templates, automation tools, handouts, cheat sheets) stores metadata plus an externally-hosted `fileUrl` — there is no file-upload/blob-storage layer in this codebase, so the row never owns the actual file bytes. `category`, `fileType`, and `accessTier` are string columns validated on read (same pattern as `LiveClass.status`), not native Prisma enums. Admin CRUD lives at `/admin/resources`; the student-facing list is `/resources`.

## Migration inventory

There are 20 committed migration directories plus `migration_lock.toml`. Migration names include the baseline, email verification, password reset, reminder idempotency, order status, discount-code archive state, live classes, simulator scenarios, modules and lessons, pricing tiers, attempt feedback, score policies, simulator attempts and decisions, email templates, webhook events, two-factor authentication, and related indexes.

Use these commands when changing the schema:

```bash
pnpm prisma validate
pnpm prisma format
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma migrate deploy
```

The migration contract test currently invokes a POSIX `./node_modules/.bin/prisma` path and therefore fails under the Windows command shell before it can run Prisma. Run it in CI or fix the path construction before using it as a local Windows gate.

## Not universal in the current schema

The following rules appeared in the original target document but are not implemented across every mutable model:

- `deletedAt` is not present on every mutable table.
- `createdById` and `updatedById` are not present on every mutable table.
- Every state machine is not a native Prisma enum.
- A separate Settings model does not exist.
- Live-class RSVP, recording, and capacity tables do not exist as a complete student-facing feature.
- Data-export and account-deletion tables or workflows are not present.

Treat these as design work or follow-up requirements, not as current database guarantees.

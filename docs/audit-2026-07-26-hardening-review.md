# Audit hardening review — 2026-07-26

## Why this doc exists

A pasted "deep public audit" of this repo (README/`package.json`/schema-only,
not the actual code) was received as a task on the
`claude/amph-v2-audit-hardening-1xa1vc` branch. Before acting on any of its
recommendations, each claim was checked against the actual source in this
repo. Several of its most important claims — including its #1 priority item
— turned out to already be fixed or never true in this codebase. A few
others turned out to be real. This doc records what was verified, so nobody
re-implements a fix that already shipped or trusts a recommendation that
would actually break something.

**Scope note:** this was a documentation-only pass. No application code was
changed. `CLAUDE.md`'s "Known gaps" section was rewritten to match verified
reality (it was stale in almost every bullet — see below).

## Claims from the pasted audit that are already fixed or false

- **"PayMongo webhook uses in-memory repos, cannot see orders created
  elsewhere."** False today. `src/app/api/webhooks/paymongo/route.ts` calls
  `buildContainer()` and uses `container.orderRepo` / `container.enrollStudent`
  — no `new InMemory*()` in the route. It also already has idempotency
  (`order.isPaid()` short-circuits re-processing) and HMAC signature
  verification via the container's `paymentGateway`. The route's own header
  comment documents this as a fixed "Tier A bug." This was the audit's
  top-priority (P0 #1) item and it does not apply.
- **"`courseRepo`/`orderRepo` wired to `InMemoryCourseRepository`/
  `InMemoryOrderRepository` in production."** False. `buildProductionContainer()`
  in `src/composition/container.ts` wires `PrismaCourseRepository` and
  `PrismaOrderRepository`. This claim came from (and was copied verbatim
  into) `CLAUDE.md`'s old "Known gaps" section, which was itself stale —
  now corrected.
- **"No admin panel exists yet."** False. `src/app/admin/` covers audit
  logs, badges, courses, discount codes, live classes, payments, refunds,
  settings, simulators, and users, gated by a real `requireAdmin()` used
  across multiple admin pages/use cases.
- **"`AuditLog` — nothing writes to it yet."** Mostly false.
  `src/composition/container.ts` wires `recordAuditLog` into roughly 30
  admin/payment use cases (refunds, course CRUD, discount codes, etc.).
  The one place this is still genuinely true: `src/usecases/SignUp.ts`
  has an unresolved `TODO (STORY-009)` — signup itself doesn't write an
  audit entry. Don't generalize from that one TODO to "audit logging isn't
  wired up."
- **"`src/lib/` and `src/components/` don't exist."** False — both exist
  now (`src/lib/auth.ts`, `webVitals.ts`, `withActionTracing.ts`;
  `src/components/{admin,astryx,auth,courses,landing,tools,ui}`).
- **"No `content/curriculum/` or import script."** False — both exist and
  are in active use (`content/curriculum/`, `content/CURRICULUM-INDEX.md`,
  `scripts/import-amph-content.ts`).
- **"Only one Prisma migration; database not provisioned."** False — 19
  migrations exist under `prisma/migrations/`, and per
  `SESSION-HANDOVER.md` the production database is Neon Postgres with all
  migrations applied and pricing tiers seeded.
- **"`User.subscriptionTier`, `User.enrolledCourseIds`,
  `User.simulatorAccess`, `User.emailVerificationToken` are legacy fields —
  remove them."** **Do not do this.** These are not vestigial: `enrolledCourseIds`
  is read/written by `EnrollStudent`, `TierAccessPolicy`, and both the
  Prisma and in-memory `UserRepository` implementations; `subscriptionTier`
  drives `TierAccessPolicy`'s access decision and is filterable in
  `ListUsers`; `emailVerificationToken` backs the email-verification flow
  directly on `User` (there's a separate `EmailVerification` model too, but
  the `User` field isn't dead). Removing any of these would break access
  control and signup, not clean up debt. If schema simplification is
  wanted here, it needs a real migration + call-site audit, not a
  find-and-delete.

## Claims from the pasted audit that turned out to be real

- **Duplicate curriculum representation.** `Course.curriculum` (a `Json`
  field, `{ sections: [{ title, lessons: [...] }] }`) still exists on the
  `Course` model _alongside_ the relational `Module`/`Lesson` models added
  later (`prisma/schema.prisma`, tagged `STORY-048b/048c / P0-2 follow-up`
  in a comment — so this drift was already flagged once before and not
  fully resolved). Nothing enforces the two stay in sync. Worth a follow-up
  story to pick one source of truth and either remove `Course.curriculum`
  or make it a rebuilt-from-`Module`/`Lesson` read cache.
- **String statuses instead of enums** — real, but narrower than claimed.
  `Order.status`, `Enrollment.status`, `Order.paymongoStatus`,
  `LiveClass.status`, `EmailLog.status`, and `QuizAttempt.status` are plain
  `String`. However `Role`, `SubscriptionTier`, `VerificationStatus`, and
  `SimulatorAccess` are already proper Prisma enums — the audit's blanket
  "too many string statuses" claim overstated the problem.
- **No admin 2FA.** Confirmed absent — no TOTP/2FA implementation found
  anywhere in the codebase, despite the admin panel covering refunds and
  payment data.
- **No persistent webhook event log.** The webhook itself is safe
  (idempotent, signature-verified, uses the real container), but there's
  no `WebhookEvent`-style table capturing raw payloads for replay/forensics
  independent of order state. A webhook that fails signature verification,
  or arrives before its order exists, currently leaves no durable trace.
- **Operational runbooks are thin.** `docs/runbooks/` exists as a
  directory but currently holds only a `README.md` — the specific runbooks
  the audit asked for (payment incident, webhook replay, DB restore, admin
  access recovery) haven't been written.

## `CLAUDE.md` corrections made in this pass

`CLAUDE.md`'s "Known gaps" section asserted several things that are no
longer true (see "already fixed or false" above — most of those claims were
copied near-verbatim from that section). It has been rewritten to list only
the gaps verified above, plus a pointer back to this doc. The "planned admin
panel" phrasing in the intro paragraph, the ADR range reference, and the
"Curriculum and content" section were also updated to match current reality.

## Follow-up status (updated as each item lands)

The pass that produced this doc was documentation-only. A second pass
implemented most of the items below — tracked here so this doc stays the
single source of truth for "what did the audit actually motivate."

1. **Done** (PR #190) — `Course.curriculum` vs `Module`/`Lesson`:
   `Module`/`Lesson` is now the write-source-of-truth; every module/lesson
   mutation use case rebuilds `curriculum` from them afterward
   (`RebuildCourseCurriculum`). The read paths (`AuthorizeLessonAccess`,
   `getLessonData`, `LessonSidebar`, `MarkLessonComplete`) were
   deliberately left reading `curriculum` unchanged — lower risk than
   rewiring them to read `Module`/`Lesson` directly.
2. **Done** (PR #186) — `SignUp.ts` now records a `user.signed_up` audit
   entry via `RecordAuditLog`, closing STORY-009's TODO.
3. **Scoped down, not done as originally proposed** (PR #188) — did not
   convert `Order.status`/`Enrollment.status`/`QuizAttempt.status` to
   native Prisma enums. Instead added `isEnrollmentStatus()`/
   `isQuizAttemptStatus()` validation on read (mirroring
   `PaymentStatus.isValid()`, which `Order` already had), fixing the
   actual bug (unchecked `as` casts letting a corrupt/legacy status
   silently hydrate an entity) without a risky `ALTER TYPE` migration.
   Native enums remain a legitimate follow-up if DB-level `CHECK`
   enforcement is specifically needed later.
4. **Done** (PR #187) — `WebhookEvent` Prisma model + `IWebhookEventLog`
   port/adapters, wired into the PayMongo webhook route. Every inbound
   request is persisted before any processing, with the outcome recorded
   afterward.
5. **Not done.** TOTP-based 2FA for `ADMIN`-role accounts remains open —
   the largest remaining item, tracked separately (see "Admin TOTP 2FA
   (opt-in)" in the session's task list / a future PR).
6. **Done** — `docs/runbooks/paymongo-outage.md`, `webhook-replay.md`,
   `db-backup-restore.md`, and `admin-access-recovery.md` written (see
   `docs/runbooks/README.md` for the updated index). The DB restore
   runbook documents the correct mechanism but has never been drilled.

## Two more gaps found while implementing the runbooks (2026-07-26)

Writing `admin-access-recovery.md` required verifying exactly how session
revocation works, which surfaced a real gap not in the original audit:

- **Session/account revocation is largely non-functional.**
  `src/lib/auth.ts`'s `getSessionUserId()`/`getSessionUser()` — the only
  session-check path, used by every page via `requireAuth`/`requireAdmin`
  — verifies the JWT's signature and expiry and re-fetches the `User` row,
  but never queries the `sessions` table and never reads
  `User.lockedUntil`/`User.failedLoginCount`. Concretely: deleting a
  `sessions` row does not invalidate an already-issued JWT cookie, and
  setting `lockedUntil` does not block anything. The only things that
  actually work today are a role change (checked fresh from the DB on
  every request — so this _does_ work for revoking admin access
  specifically) and a full `JWT_SECRET` rotation (works, but logs out
  every user on the platform). Worth its own hardening story — e.g.
  checking `sessions` table membership, or a `tokenVersion` claim, on
  every request.
- **`pnpm db:seed:admin` is broken.** `package.json` points it at
  `scripts/seed-admin-user.mjs`, which does not exist — only
  `gen-secret.js`, `import-amph-content.ts`, `seed-pricing-tiers.ts`, and
  `seed-simulator-policies.ts` are present in `scripts/`. There is
  currently no way to create the first admin user other than the direct
  SQL `UPDATE` documented in `docs/runbooks/admin-access-recovery.md`.
  Worth either writing the missing script or removing the stale
  `package.json` entry.

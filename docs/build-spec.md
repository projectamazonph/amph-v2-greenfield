# Build Spec — Project Amazon PH Academy v2 (Greenfield)

**Date:** 2026-07-17
**Owner:** Ryan Roland Dabao
**Status:** Approved (day-0 architecture)

This is the engineering build spec. It tells you what goes where, why, and what the contract is. Read once before your first commit. Then forget it. The folder structure tells you where things go.

---

## 0. The Rule

**Dependency direction is always inward.**

```
app/         → usecases/ → ports/ ← infra/
              domain/  (imports nothing)
```

`src/domain/`, `src/ports/`, and `src/usecases/` do not import from `next/*`, `@prisma/*`, `paymongo`, `resend`, or `@sentry/*`. ESLint enforces this. ADR-016.

---

## 1. Layer 1 — `src/domain/`

Pure business model. The most valuable code in the repo, because it's the only code that doesn't change when you swap frameworks, databases, or third parties.

### What goes here

- **Entities.** `Course`, `Module`, `Lesson`, `Enrollment`, `Payment`, `Refund`, `User`, `Certificate`, `Simulator`, `Scenario`. Plain classes or `readonly` interfaces with constructor validation.
- **Value objects.** `Money`, `Email`, `Tier`, `Slug`, `QuizAttempt`, `ProgressEvent`, `BidRecommendation`. Always immutable, always validated at construction.
- **Pure functions.** `recommendBids(rows, rules)`, `canAccessCourse(user, course)`, `canRequestRefund(payment, now)`, `quotePricing(course, user, coupon, opts)`, `computeLevel(xp)`, `evaluateQuiz(answers, key)`. No IO, no `Date.now()`, no `Math.random()`.
- **State machines.** Refund states, enrollment states, payment states. Discriminated unions, exhaustive `switch`.

### What does NOT go here

- Anything that imports from `next`, `prisma`, `paymongo`, `resend`, `node:fs`, `node:net`.
- Anything that calls a function that does those imports.
- TypeScript types that exist only to satisfy a framework (e.g. Next.js `Metadata`, React `ComponentProps`).

### Contract

- 100% branch coverage. Always. The code is pure; there's no excuse.
- Every entity has a `reconstitute(row)` factory for the infra layer to call, and a constructor with validation.
- Every pure function is referentially transparent. `f(x) === f(x)` always.

### File shape

```
src/domain/
├── shared/
│   ├── Money.ts
│   ├── Email.ts
│   ├── Slug.ts
│   ├── Tier.ts
│   └── Result.ts
├── courses/
│   ├── Course.ts
│   ├── Module.ts
│   ├── Lesson.ts
│   ├── Progress.ts
│   └── rules/
│       ├── canAccessCourse.ts
│       └── canIssueCertificate.ts
├── payments/
│   ├── Payment.ts
│   ├── Checkout.ts
│   ├── Refund.ts
│   ├── WebhookEvent.ts
│   └── rules/
│       ├── canRequestRefund.ts
│       └── isIdempotentReplay.ts
├── simulators/
│   ├── Simulator.ts            # the interface
│   ├── BidElevator.ts
│   ├── StrTriage.ts
│   ├── CampaignBuilder.ts
│   ├── ListingAudit.ts
│   └── KeywordResearch.ts
├── progress/
│   ├── ProgressEvent.ts
│   ├── XPEvent.ts
│   └── rules/
│       └── computeLevel.ts
└── users/
    ├── User.ts
    └── rules/
        └── isAdmin.ts
```

---

## 2. Layer 2 — `src/ports/`

Interfaces. The contract between the use cases and the outside world. Every method returns `Promise<Result<T, E>>`.

### What goes here

- **Repository ports.** One per table. `CourseRepository`, `EnrollmentRepository`, `PaymentRepository`, etc.
- **Gateway ports.** `PaymentGateway`, `EmailSender`, `PdfRenderer`, `RateLimiter`.
- **Service ports.** `AccessPolicy`, `PricingService`, `CertificateIssuer`, `StreakService`, `XPService`, `ContentRenderer`.
- **System ports.** `Clock`, `IdGenerator`, `Logger`, `Tracer`, `EventBus`.

### What does NOT go here

- Implementations. `src/ports/` has no `.ts` file that has a class body with real code. Only interfaces, types, and JSDoc.
- Imports from `infra/`, `app/`, `composition/`, or any framework.

### Contract

- Every method has a JSDoc block that documents: input shape, output shape, error cases, idempotency, and postconditions.
- Every port has at least one `Fake*` implementation in `src/infra/<concern>/fake/`. The fake must honor the same postconditions as the real adapter.
- Every port has at least one test that asserts the fake's behavior matches the JSDoc.

### File shape

The actual layout groups ports by concern, not by structural kind (repository / gateway / service / system). Naming is inconsistent across the codebase: some ports are `I`-prefixed (`IPaymentGateway`, `IAccessPolicy`, `IEnrollmentRepository`, `IDiscountCodeRepository`, `ICertificateRepository`), others are not (`UserRepository`, `CourseRepository`, `SessionRepository`, `Clock`, `IdGenerator`, `EmailSender`, `CertificateRenderer`). **Match the existing sibling file's convention when adding a new one** rather than "fixing" the mix.

```
src/ports/
├── repositories/                 # one per table (ISP)
│   ├── UserRepository.ts
│   ├── CourseRepository.ts
│   ├── ModuleRepository.ts
│   ├── LessonRepository.ts
│   ├── EnrollmentRepository.ts
│   ├── OrderRepository.ts
│   ├── PaymentRepository.ts
│   ├── RefundRepository.ts
│   ├── AttemptRepository.ts
│   ├── ProgressRepository.ts
│   ├── BadgeRepository.ts
│   ├── BadgeAwardRepository.ts
│   ├── LiveClassRepository.ts
│   ├── CertificateRepository.ts
│   ├── QuizRepository.ts
│   ├── QuizAttemptRepository.ts
│   ├── XPEventRepository.ts
│   ├── UserStreakRepository.ts
│   ├── AuditLogRepository.ts
│   ├── DiscountCodeRepository.ts
│   ├── EmailLogRepository.ts
│   ├── EmailTemplateRepository.ts
│   ├── EmailVerificationRepository.ts
│   ├── PasswordResetRepository.ts
│   ├── SentReminderRepository.ts
│   ├── ScorePolicyRepository.ts
│   ├── PpcCampaignRepository.ts
│   ├── PricingTierRepository.ts
│   ├── SessionRepository.ts
│   └── SimulatorAttemptRepository.ts
├── payment/                      # gateways that talk to payment providers
│   ├── IPaymentGateway.ts
│   └── IPaymongoClient.ts
├── email/                        # email senders + per-template renderers
│   ├── IEmailSender.ts
│   ├── PasswordResetRenderer.ts
│   └── ...
├── security/                     # auth, hashing, JWT, 2FA
│   ├── IPasswordHasher.ts
│   ├── IJwtService.ts
│   ├── IRateLimiter.ts
│   └── ITotpService.ts
├── access/                       # access policies, capability checks
│   └── IAccessPolicy.ts
├── rendering/                    # PDF + content (MDX) renderers
│   ├── ICertificateRenderer.ts
│   ├── IReceiptRenderer.ts
│   └── IContentRenderer.ts
├── system/                       # clock, ids, logging, tracing
│   ├── IClock.ts
│   ├── IIdGenerator.ts
│   ├── ILogger.ts
│   ├── ITracer.ts
│   └── IEventBus.ts
└── simulator/                    # simulator port + registry
    ├── ISimulator.ts
    ├── ISimulatorRegistry.ts
    └── ISimulatorScenarioRepository.ts
```

---

## 3. Layer 3 — `src/usecases/`

Orchestration. One class per use case. Constructor-injected ports. The use case is the only place that knows the business flow.

### What goes here

- One class per use case, in its own file. `StartCheckout`, `HandlePaymentWebhook`, `EnrollStudent`, `IssueCertificate`, `RunBidElevator`, etc.
- Constructor takes ports. No field setters, no service locators.
- `async exec(input): Promise<Result<Output, Error>>` is the only public method.
- Internal flow: validate → load → check policy → execute side effects via ports → return Result.

### What does NOT go here

- Imports from `next`, `prisma`, `paymongo`, `resend`, `@sentry/*`, `server-only`.
- Direct IO. The use case does not call `fetch`, `fs.readFile`, `prisma.user.findMany`, etc. It calls ports.
- Logging side effects. Logging is via the `Logger` port, not `console.log`.
- More than one use case per file. Always.

### Contract

- Tested with `buildTestContainer()`. Every use case has at least: a happy path test, an error path test per error case, an idempotency test if applicable.
- Errors are typed discriminated unions, not strings. `{ kind: "course_not_found" }`, not `"Course not found"`.
- No `try/catch` unless the catch re-wraps into a `Result.err`. Throw only for invariant violations.

### File shape

The actual layout is **flat** under `src/usecases/` (one class per file, no per-feature subdirectories except for `auth/` and `__tests__/`). Use case names match their import name exactly:

```
src/usecases/
├── auth/                         # only nested subdirectory; auth use cases
│   ├── SignUp.ts
│   ├── Login.ts                  # (was SignIn in the day-0 plan; renamed to Login)
│   ├── Logout.ts
│   ├── RequestPasswordReset.ts
│   ├── ResetPassword.ts
│   ├── VerifyEmail.ts
│   ├── ResendVerification.ts
│   ├── EnableTwoFactor.ts
│   ├── ConfirmTwoFactor.ts
│   └── DisableTwoFactor.ts
├── ApplyDiscountCode.ts
├── ArchiveCourse.ts
├── ArchiveSimulatorScenario.ts
├── AuthorizeLessonAccess.ts
├── AwardBadge.ts
├── AwardXP.ts
├── CheckCourseAccess.ts
├── ComposeAttemptFeedback.ts
├── CreateCourse.ts
├── CreateLesson.ts
├── CreateLiveClass.ts
├── CreateModule.ts
├── CreatePaymentIntent.ts
├── CreateSimulatorScenario.ts
├── DeleteLesson.ts
├── DeleteLiveClass.ts
├── DeleteModule.ts
├── EnrollStudent.ts
├── ExportAuditLogs.ts
├── GetAdminDashboardStats.ts
├── GetCatalogCourse.ts
├── GetCourse.ts
├── GetEmailTemplate.ts
├── GetSimulatorScenario.ts
├── GetUserDetail.ts
├── GradeSimulatorAttempt.ts
├── IssueCertificate.ts
├── ListCourses.ts
├── ListUserBadges.ts
├── MarkLessonComplete.ts
├── RecordQuizAttempt.ts
├── RecordStreakVisit.ts
├── RenderCertificatePdf.ts
├── RequestRefund.ts
├── RevokeCertificate.ts
├── RevokeEnrollment.ts
├── SaveSimulatorDecision.ts
├── StartSimulatorAttempt.ts
├── SubmitSimulatorAttempt.ts
├── UpdateCourse.ts
├── UpdateDiscountCode.ts
├── UpdateLesson.ts
├── UpdateLiveClass.ts
├── UpdateModule.ts
├── UpdateSimulatorScenario.ts
├── VerifyCertificate.ts
├── Admin*                          # ~30 admin use cases, flat at this level
└── ...
```

The day-0 plan nested use cases by feature (`auth/`, `checkout/`, `enroll/`, etc.). In practice the surface grew to ~80 use cases with heavy cross-feature reuse (e.g. an admin update may call into auth, course, and audit use cases in the same transaction), so the flat layout with prefixes (`Create*`, `Update*`, `List*`, `Admin*`) won out. When adding a new use case, default to a flat file at `src/usecases/<PascalCaseName>.ts`; only create a new subdirectory if you have at least 3 sibling use cases that genuinely cluster.

---

## 4. Layer 4 — `src/infra/`

Adapters. The only layer that imports from frameworks and external SDKs. Each adapter implements one port.

### What goes here

- Prisma-backed implementations of every repository port.
- `PayMongoGateway` implementing `PaymentGateway`. Maps the PayMongo SDK to domain types.
- `ResendEmailSender` implementing `EmailSender`. Wraps the Resend SDK and React Email.
- `ReactPdfRenderer` implementing `PdfRenderer`. Renders certificate and receipt PDFs.
- `UpstashRateLimiter` implementing `RateLimiter`. Or `InMemoryRateLimiter` for local dev.
- `SystemClock` implementing `Clock`. `FixedClock` for tests.
- `UlidGenerator` implementing `IdGenerator`. `DeterministicIdGenerator` for tests.
- `PinoLogger` implementing `Logger`.
- `SentryTracer` implementing `Tracer`.
- `InMemoryEventBus` implementing `EventBus`. (Day-1 in-memory; swap to SQS / Inngest later.)

### What does NOT go here

- Business logic. Adapters translate between the outside world and domain types. They do not decide what should happen.
- Direct imports from `app/`. The composition root in `src/composition/` is the only thing that knows about both.

### Contract

- Every adapter maps to and from a domain type. Prisma rows become domain entities via `toDomain(row)`. Domain entities become Prisma write inputs via `toWriteInput(entity)`.
- Adapters do not throw across the port boundary. They catch SDK errors and return `Result.err({ kind: "specific_error", ... })`.
- Every adapter has a `Fake*` sibling in `src/infra/<concern>/fake/`. The fake is the source of truth for the port's behavior; the real adapter is checked against the fake in integration tests.

### File shape

The real layout puts Prisma-backed and in-memory implementations of the same port **side by side** under `src/infra/<concern>/` (no `db/prisma/` vs `db/inmemory/` split, no `fake/` subdirectory — the fake is the next file in the same folder). The day-0 plan's `fake/` subdirectory was rolled back because it added nesting without value: a reader looking for `FakePayMongoGateway` finds it in the same dir as `PayMongoGateway`.

```
src/infra/
├── repositories/                 # one per repository port; Prisma-backed + InMemory fake side by side
│   ├── PrismaUserRepository.ts
│   ├── InMemoryUserRepository.ts
│   ├── PrismaCourseRepository.ts
│   ├── InMemoryCourseRepository.ts
│   ├── PrismaModuleRepository.ts
│   ├── InMemoryModuleRepository.ts
│   ├── PrismaLessonRepository.ts
│   ├── InMemoryLessonRepository.ts
│   ├── PrismaEnrollmentRepository.ts
│   ├── InMemoryEnrollmentRepository.ts
│   ├── PrismaOrderRepository.ts
│   ├── PrismaPricingTierRepository.ts
│   ├── PrismaXPEventRepository.ts
│   ├── PrismaUserStreakRepository.ts
│   ├── PrismaQuizRepository.ts
│   ├── PrismaQuizAttemptRepository.ts
│   ├── PrismaBadgeRepository.ts
│   ├── InMemoryBadgeRepository.ts
│   ├── PrismaBadgeAwardRepository.ts
│   ├── InMemoryBadgeAwardRepository.ts
│   ├── PrismaLiveClassRepository.ts
│   ├── InMemoryLiveClassRepository.ts
│   ├── PrismaCertificateRepository.ts
│   ├── InMemoryCertificateRepository.ts
│   ├── PrismaProgressEventRepository.ts
│   ├── InMemoryProgressEventRepository.ts
│   ├── PrismaAuditLog.ts
│   ├── InMemoryAuditLog.ts
│   ├── PrismaDiscountCodeRepository.ts
│   ├── InMemoryDiscountCodeRepository.ts
│   ├── PrismaEmailVerificationRepository.ts
│   ├── PrismaPasswordResetRepository.ts
│   ├── PrismaSentReminderRepository.ts
│   ├── PrismaScorePolicyRepository.ts
│   ├── InMemoryScorePolicyRepository.ts
│   ├── PrismaSimulatorAttemptRepository.ts
│   ├── InMemorySimulatorAttemptRepository.ts
│   ├── PrismaSessionRepository.ts
│   ├── InMemorySessionRepository.ts
│   ├── PrismaEmailTemplateRepository.ts
│   ├── InMemoryEmailTemplateRepository.ts
│   └── ...
├── database/                     # Prisma client wiring (driver adapter for Prisma 7 + pg)
│   └── prisma.ts
├── payment/
│   ├── PayMongoAdapter.ts
│   ├── PaymongoClient.ts
│   └── InMemoryPaymongoClient.ts
├── email/
│   ├── ResendEmailSender.ts
│   ├── InMemoryEmailSender.ts
│   └── templates/                # React Email templates + per-template renderers
│       ├── PasswordResetRenderer.ts
│       └── ...
├── pdf/
│   ├── ReactPdfCertificateRenderer.ts
│   ├── ReactPdfReceiptRenderer.ts
│   └── InMemoryPdfRenderer.ts
├── security/
│   ├── Argon2PasswordHasher.ts
│   ├── JoseJwtService.ts
│   ├── UpstashRateLimiter.ts
│   ├── OtpauthTotpService.ts
│   └── InMemory* (one per real adapter)
├── access/
│   └── TierAccessPolicy.ts
├── simulator/
│   ├── buildSimulatorRegistry.ts
│   ├── InMemorySimulatorRegistry.ts
│   ├── StubSimulator.ts
│   ├── InMemorySimulatorScenarioRepository.ts
│   ├── PrismaSimulatorScenarioRepository.ts
│   └── ...
├── live-class/
│   └── ...
├── content/
│   └── MDXContentRenderer.ts
├── observability/
│   ├── PinoLogger.ts
│   └── SentryTracer.ts
└── system/
    ├── SystemClock.ts
    ├── FixedClock.ts             # test impl
    ├── UlidGenerator.ts
    └── InMemoryEventBus.ts
```

---

## 5. Layer 5 — `src/app/`

Next.js App Router. RSC by default. Server actions are 5-line shims. Route handlers exist only for webhooks and third-party callbacks.

### What goes here

- RSC pages. Read from the use case layer. Pass data to dumb components.
- Server actions. `parse(formData) → call(useCase) → return Result`. Never more than 10 lines.
- Route handlers for `/api/paymongo/webhook` and `/api/resend/webhook` (and nothing else).
- `error.tsx`, `not-found.tsx`, `loading.tsx`, `layout.tsx` per route.
- Auth middleware (`src/middleware.ts`).

### What does NOT go here

- Business logic. Pages do not decide pricing. Actions do not decide eligibility. The use case does.
- Direct Prisma queries. Pages call use cases, use cases call ports, ports are implemented by infra.
- Anything that should be in a component. `src/components/` is for shared UI primitives.

### Contract

- Every server action validates input with Zod before calling the use case.
- Every server action returns a discriminated union: `{ ok: true, value } | { ok: false, error }`.
- Every RSC handles the "no data" case (`notFound()`, `<EmptyState>`, or `<Forbidden>`).
- Every page is mobile-first responsive at 390px.

### File shape

The real layout has no route groups (`(auth)/`, `(dashboard)/`); routes live at the top level. The day-0 plan grouped them for layout isolation, but Next.js layouts work just as well at the top level and the grouping hid the actual route URLs from new contributors.

```
src/app/
├── layout.tsx                            # root layout
├── page.tsx                              # landing
├── providers.tsx                         # client-side providers
├── global-error.tsx
├── globals.css
├── signup/page.tsx                       # /signup
├── login/page.tsx                        # /login
├── admin-login/page.tsx                  # /admin-login (role check; see CLAUDE.md "Known gaps")
├── verify-email/page.tsx
├── reset-password/page.tsx
├── reset-password/[token]/page.tsx
├── pricing/page.tsx                      # /pricing
├── checkout/page.tsx                     # /checkout/[tier] in practice
├── checkout/success/page.tsx
├── dashboard/page.tsx                    # /dashboard (auth-gated)
├── profile/page.tsx
├── courses/                              # catalog + detail
│   ├── page.tsx
│   └── [slug]/
│       ├── page.tsx
│       ├── certificate/page.tsx
│       └── lessons/[lessonSlug]/
│           ├── page.tsx
│           └── quiz/page.tsx
├── tools/                                # simulator index + per-scenario
│   ├── page.tsx
│   └── [tool]/[slug]/page.tsx
├── certificates/
│   └── [hash]/
│       ├── page.tsx
│       └── pdf/route.ts
├── admin/                                # requireAdmin() at the top layout
│   ├── layout.tsx
│   ├── page.tsx                          # dashboard
│   ├── _lib/                             # admin-only helpers (e.g. getCurrentAdminId)
│   ├── users/                            # list + [id] + impersonate
│   ├── courses/                          # list + [id] + [id]/edit
│   ├── payments/                         # list + [id]
│   ├── refunds/                          # list + [id]
│   ├── simulators/                       # list + new + [id]/edit (scenario CRUD)
│   ├── live-classes/                     # list + new + [id]/edit
│   ├── discount-codes/                   # list + new + [id]/edit
│   ├── badges/                           # list + new + [slug]/edit
│   ├── audit-log/                        # list + export/route.ts (CSV)
│   └── settings/                         # 2FA opt-in, etc.
├── api/
│   ├── auth/                             # login, signup, logout, admin-login
│   ├── webhooks/
│   │   └── paymongo/route.ts
│   ├── cron/                             # live-class-reminders
│   ├── health/
│   └── quizzes/[quizId]/attempt/         # small internal API
├── actions/                              # server actions, one file per action (40+ files)
│   ├── signup.action.ts
│   ├── login.action.ts
│   ├── checkout.action.ts
│   ├── archiveCourse.action.ts
│   ├── ...                               # see src/app/actions/ for the full list
│   └── __tests__/
└── middleware.ts                         # security headers + JWT session verification + request-container scope
```

---

## 6. `src/composition/` — The DI Container

The only file that knows every concrete type.

### `container.ts`

```ts
export type Container = {
  clock: Clock;
  ids: IdGenerator;
  logger: Logger;
  tracer: Tracer;
  events: EventBus;

  users: UserRepository;
  courses: CourseRepository;
  modules: ModuleRepository;
  lessons: LessonRepository;
  enrollments: EnrollmentRepository;
  payments: PaymentRepository;
  refunds: RefundRepository;
  attempts: AttemptRepository;
  progress: ProgressRepository;
  badges: BadgeRepository;
  liveClasses: LiveClassRepository;
  certificates: CertificateRepository;
  auditLog: AuditLogRepository;
  discountCodes: DiscountCodeRepository;

  gateway: PaymentGateway;
  email: EmailSender;
  pdf: PdfRenderer;
  rateLimiter: RateLimiter;
  contentRenderer: ContentRenderer;
  access: AccessPolicy;
  pricing: PricingService;
  xp: XPService;
  streak: StreakService;
};

export function buildContainer(): Container {
  /* ... */
}
export function buildTestContainer(overrides?: Partial<Container>): Container {
  /* ... */
}
```

### Request-scope container

`src/composition/container.ts` exports `runWithContainer()` and `getContainer()` for the `AsyncLocalStorage`-based request scope (alongside `buildContainer()` / `buildTestContainer()`). There is no separate `requestContainer.ts`; the request scope lives in the same file as the rest of the composition. The names `runWithContainer` / `getContainer` are the ground truth — read `src/composition/container.ts` rather than assuming from this doc.

### `src/middleware.ts`

```ts
export async function middleware(req: NextRequest) {
  return runWithContainer(buildContainer(), () => next(req));
}
```

Use cases and pages get the container via `getContainer()`. No globals, no singletons.

---

## 7. The SOLID Contract

### Single Responsibility

- One class per file. Always.
- Repositories own one table each.
- Use cases orchestrate; they do not implement IO.
- Adapters translate between outside world and domain.

### Open/Closed

- New payment gateway = new adapter in `src/infra/<provider>/`. No edits to use cases or the app.
- New simulator = one new file in `src/domain/simulators/<name>/` + one entry in the registry. No edits to the tools page, access policy, or API.
- New admin feature = one server action + one page; use cases are unchanged.

### Liskov Substitution

- Every port has a `Fake*` implementation. The fake and the real must honor the same postconditions.
- Tests for the use case run against the fake. Integration tests run against the real. The contract is the port.

### Interface Segregation

- Repositories are split per use case, not one god `PrismaClient`.
- `EnrollmentRepository` is not `UserRepository`. `CourseRepository` is not `ModuleRepository`.
- If a use case only needs `findById`, it depends on a port that exposes `findById`, not a port that exposes 20 methods.

### Dependency Inversion

- `src/domain/`, `src/ports/`, `src/usecases/` never import from `next/*`, `@prisma/*`, `paymongo`, `resend`, `@sentry/*`, `server-only`. ESLint blocks it. ADR-016.

---

## 8. Testing Strategy

### Unit tests (Vitest)

Test files live in two places, both picked up by `vitest.config.ts`:

- Colocated `__tests__/` folders next to the source (e.g. `src/domain/entities/__tests__/User.test.ts`).
- A mirrored tree under `tests/unit/` (e.g. `tests/unit/domain/simulator/`). Prefer this for tests that exercise the composition container against a Prisma client, where a real env (`DATABASE_URL`, `JWT_SECRET`) is required; colocated `__tests__/` are fine for pure-domain or pure-port-contract tests.

Every domain function: 100% branch coverage. They are pure. Every use case: tested with `buildTestContainer()`. Cover happy path + every error case + idempotency if applicable. Every adapter: integration test against the real SDK (PayMongo sandbox, Resend test mode). Plus unit test for the in-memory fake to confirm the fake matches the port contract.

### Integration tests (Vitest)

Use case flow: `SignUp → VerifyEmail → StartCheckout → HandlePaymentWebhook → EnrollStudent → MarkLessonComplete → IssueCertificate`. Real Postgres in CI, real PayMongo sandbox for the payment step (or `FakePayMongoGateway` if the sandbox is down). Tenant isolation: every server action, every route handler, every Prisma query that touches user-owned data goes through a guard. The test asserts the guard.

### E2E tests (Playwright, `tests/e2e/`)

- 6 critical journeys at 3 viewports (375×812, 768×1024, 1280×800):
  1. Anonymous → pricing → signup → empty dashboard
  2. Signup → checkout (PayMongo test mode) → enrollment → first lesson
  3. Lesson → quiz → pass → next module
  4. Simulator: Bid Elevator end-to-end
  5. Admin: discount code create → student uses it → audit log entry
  6. Refund: within window → enrollment revoked → receipt email
- axe accessibility checks on every E2E.

### Coverage gates (CI, fail build)

Thresholds actually enforced by `pnpm test:coverage` (`vitest.config.ts`): 80% lines, 70% branches, 80% functions, 80% statements (a single repo-wide gate, not per-layer). The higher per-layer numbers in earlier drafts of this doc (100% domain, 90% usecases) are the aspirational target, not the configured gate — track both when reviewing a PR.

---

## 9. The Error Protocol

When something breaks:

1. **Read the actual error.** Don't guess. The error tells you the file, the line, the contract violated.
2. **Reproduce in the smallest test.** If a use case fails, the test is a use-case test with `buildTestContainer()`. If an adapter fails, the test is an integration test against the real SDK.
3. **Fix the root cause.** Not the symptom. If the use case returned the wrong shape, the use case is wrong. If the page renders wrong because the use case is right but the page is wrong, the page is wrong.
4. **Add a test that would have caught this.** Always. The fix and the test land in the same commit.
5. **Commit fix + test together.** `fix(<area>): <one-line> (STORY-XXX)`. Reference the story.

If the bug is in a domain function: the fix is a domain change. Update the port, the use case, the adapter, the test, the doc. Domain bugs ripple.

If the bug is in a use case: the fix is a use case change. Update the use case, the test, the doc. Use case bugs ripple to the page (only if the page was depending on the wrong shape — usually not).

If the bug is in an adapter: the fix is an adapter change. Update the adapter, the integration test, the doc. Adapter bugs ripple to the use case only if the port contract was wrong.

If the bug is in a page: the fix is a page change. Page bugs do not ripple.

---

## 10. Adding a New Feature (the Recipe)

1. **Model the domain.** Add entities and value objects in `src/domain/<feature>/` (or in the existing `entities/` / `values/` subdirectories if it's a single entity, not a new feature). No imports from `app/` or `infra/`. Write tests next to the file (colocated `__tests__/` or `tests/unit/...`). 100% branch coverage.
2. **Define the port(s).** Add an interface in `src/ports/<concern>/` (existing concerns: `repositories/`, `payment/`, `email/`, `security/`, `access/`, `rendering/`, `simulator/`, `system/`). Document postconditions in JSDoc. Write an `InMemory*` / `Fake*` / `Stub*` implementation next to the other adapters in `src/infra/<concern>/` — **not** in a `fake/` subdirectory; the day-0 plan's `fake/` was rolled back. Test the fake matches the port contract.
3. **Write the use case.** Add a class as a new file directly under `src/usecases/`. Constructor-inject the ports (usually via a single options object, following the existing use cases). Use `Result<T, E>`. Test with `buildTestContainer()`.
4. **Implement the adapter (if needed).** In `src/infra/<concern>/`. Wrap the real SDK. Map to and from domain types. Integration test against the real SDK.
5. **Wire it.** Add to `src/composition/container.ts` — both `buildProductionContainer()` and `buildTestContainer()`.
6. **Expose it.** Add a server action in `src/app/actions/<feature>.action.ts` (5–10 lines: parse with Zod, call the use case, return the `Result`) or a page at `src/app/<route>/page.tsx` (no route groups; flat).
7. **Add a story.** `docs/stories/STORY-XXX.md`. Acceptance criteria, files touched, code shape, pitfalls, verification, DoD.
8. **Open a PR.** Conventional commit. `pnpm tsc --noEmit && pnpm lint && pnpm test` all green. Story ID in the commit message.

---

## 11. The Sprint Cadence

The day-0 plan was 12 sprints × 5 stories = 60 stories, 60 points. In practice the surface grew: the current `docs/sprint-plan.md` defines Sprints 1–16 with ~89 stories, and the simulator rebuilds (STORY-064–070) plus the audit-hardening follow-ups (#186–#199) account for most of the overage. Per-sprint velocity has held at ~5 points with a one-story-per-PR discipline. One point per story by design. Sprint length: ~1 calendar week.

The cadence is:

1. Pick up the next story from `docs/sprint-plan.md`.
2. Open the story file. Read acceptance criteria, files touched, code shape, pitfalls, verification, DoD.
3. Build it. Test it. Commit. PR. Merge.
4. Update `SESSION-HANDOVER.md` "Daily log" with what was done, what was explicitly not done, what the next agent should do.
5. Conventional commit, reference the story ID.

Stories are 1 point by design. If a story is bigger than 1 point, split it. If a story is smaller, that's fine — leave it 1 point and use the slack for the next story.

---

## 12. Conventions Cheat Sheet

| Concern                    | Convention                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File names (non-component) | `kebab-case.ts`                                                                                                                                                                         |
| File names (components)    | `PascalCase.tsx`                                                                                                                                                                        |
| Class names                | `PascalCase`                                                                                                                                                                            |
| Function names             | `camelCase`                                                                                                                                                                             |
| Constants                  | `UPPER_SNAKE_CASE` for module-level, `camelCase` otherwise                                                                                                                              |
| Interface vs type          | `interface` for ports and shapes, `type` for unions and aliases                                                                                                                         |
| `readonly`                 | Every domain entity field. Always.                                                                                                                                                      |
| `private constructor`      | On every value object. Static factory for construction.                                                                                                                                 |
| `Result<T, E>`             | Every port method's return type.                                                                                                                                                        |
| Errors                     | Discriminated unions, `{ kind: "..." , ... }`.                                                                                                                                          |
| Comments                   | The why, not the what.                                                                                                                                                                  |
| Tests                      | Colocated `__tests__/` next to the source, or a mirrored `tests/unit/` tree — both picked up by `vitest.config.ts`. Pick the location by what the test needs (pure vs. needs real env). |
| Commits                    | Conventional, story ID in parentheses.                                                                                                                                                  |
| Money                      | `Money` value object, integer minor.                                                                                                                                                    |
| Time                       | `Clock` port, never `new Date()` in business code.                                                                                                                                      |
| IDs                        | `IdGenerator` port, never `crypto.randomUUID()` in business code.                                                                                                                       |
| Logging                    | `Logger` port, never `console.log` in committed code.                                                                                                                                   |
| Errors                     | `Result.err` across boundaries. Throw only for invariant violations.                                                                                                                    |
| `any`                      | Banned. `unknown` + narrowing, or a real type.                                                                                                                                          |
| Emojis in code             | Banned.                                                                                                                                                                                 |
| Em-dashes in copy          | Banned. Use periods, commas, parentheses.                                                                                                                                               |
| AI-slop phrases            | Banned. ESLint rule.                                                                                                                                                                    |

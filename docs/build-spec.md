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

```
src/ports/
├── repositories/
│   ├── UserRepository.ts
│   ├── CourseRepository.ts
│   ├── ModuleRepository.ts
│   ├── LessonRepository.ts
│   ├── EnrollmentRepository.ts
│   ├── PaymentRepository.ts
│   ├── RefundRepository.ts
│   ├── AttemptRepository.ts
│   ├── ProgressRepository.ts
│   ├── BadgeRepository.ts
│   ├── LiveClassRepository.ts
│   ├── CertificateRepository.ts
│   ├── AuditLogRepository.ts
│   └── DiscountCodeRepository.ts
├── gateways/
│   ├── PaymentGateway.ts
│   └── EmailSender.ts
├── services/
│   ├── AccessPolicy.ts
│   ├── PdfRenderer.ts
│   ├── PricingService.ts
│   ├── CertificateIssuer.ts
│   ├── RateLimiter.ts
│   ├── ContentRenderer.ts
│   ├── StreakService.ts
│   ├── XPService.ts
│   └── ProgressService.ts
├── system/
│   ├── Clock.ts
│   ├── IdGenerator.ts
│   ├── Logger.ts
│   ├── Tracer.ts
│   └── EventBus.ts
└── events/
    └── SimulatorEvent.ts      # event shapes, no impl
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

```
src/usecases/
├── auth/
│   ├── SignUp.ts
│   ├── SignIn.ts
│   ├── SignOut.ts
│   ├── RequestPasswordReset.ts
│   ├── ResetPassword.ts
│   ├── VerifyEmail.ts
│   └── ResendVerification.ts
├── checkout/
│   ├── StartCheckout.ts
│   └── HandlePaymentWebhook.ts
├── enroll/
│   ├── EnrollStudent.ts
│   └── RevokeEnrollment.ts
├── refund/
│   ├── RequestRefund.ts
│   └── AdminIssueRefund.ts
├── certificate/
│   ├── IssueCertificate.ts
│   ├── VerifyCertificate.ts
│   └── RevokeCertificate.ts
├── simulators/
│   ├── RunBidElevator.ts
│   ├── RunStrTriage.ts
│   ├── RunCampaignBuilder.ts
│   ├── RunListingAudit.ts
│   └── RunKeywordResearch.ts
├── progress/
│   ├── MarkLessonComplete.ts
│   ├── RecordQuizAttempt.ts
│   ├── RecordStreakVisit.ts
│   └── RecordSimulatorAttempt.ts
├── badges/
│   ├── AwardBadge.ts
│   ├── RevokeBadge.ts
│   └── ListUserBadges.ts
└── admin/
    ├── AdminUpdateUser.ts
    ├── AdminCreateDiscountCode.ts
    ├── AdminUpdateCourse.ts
    └── AdminUpdatePricingSettings.ts
```

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

```
src/infra/
├── db/
│   ├── prisma/
│   │   ├── PrismaUserRepository.ts
│   │   ├── PrismaCourseRepository.ts
│   │   ├── PrismaModuleRepository.ts
│   │   ├── PrismaLessonRepository.ts
│   │   ├── PrismaEnrollmentRepository.ts
│   │   ├── PrismaPaymentRepository.ts
│   │   ├── PrismaRefundRepository.ts
│   │   ├── PrismaAttemptRepository.ts
│   │   ├── PrismaProgressRepository.ts
│   │   ├── PrismaBadgeRepository.ts
│   │   ├── PrismaLiveClassRepository.ts
│   │   ├── PrismaCertificateRepository.ts
│   │   ├── PrismaAuditLogRepository.ts
│   │   └── PrismaDiscountCodeRepository.ts
│   └── inmemory/
│       ├── InMemoryUserRepository.ts
│       ├── InMemoryCourseRepository.ts
│       └── ... (one per Prisma*Repository, identical surface)
├── paymongo/
│   ├── PayMongoGateway.ts
│   └── fake/
│       └── FakePayMongoGateway.ts
├── email/
│   ├── ResendEmailSender.ts
│   └── fake/
│       └── ConsoleEmailSender.ts
├── pdf/
│   └── ReactPdfRenderer.ts
├── ratelimit/
│   ├── UpstashRateLimiter.ts
│   └── fake/
│       └── InMemoryRateLimiter.ts
├── content/
│   └── MDXContentRenderer.ts
├── observability/
│   ├── PinoLogger.ts
│   └── SentryTracer.ts
├── system/
│   ├── SystemClock.ts
│   ├── UlidGenerator.ts
│   └── InMemoryEventBus.ts
└── pricing/
    ├── TierPricingService.ts
    └── EarlyBirdPricingService.ts
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

```
src/app/
├── layout.tsx
├── page.tsx                              # landing
├── (auth)/
│   ├── signin/page.tsx
│   ├── signup/page.tsx
│   ├── verify-email/page.tsx
│   ├── reset-password/page.tsx
│   └── reset-password/[token]/page.tsx
├── (dashboard)/
│   ├── layout.tsx                        # auth-gated layout
│   ├── dashboard/page.tsx
│   ├── courses/
│   │   ├── page.tsx                      # catalog
│   │   └── [courseSlug]/
│   │       ├── page.tsx                  # course detail
│   │       ├── certificate/page.tsx
│   │       └── lessons/
│   │           └── [lessonSlug]/
│   │               ├── page.tsx
│   │               └── quiz/page.tsx
│   ├── tools/
│   │   ├── page.tsx                      # simulator index
│   │   └── [tool]/
│   │       └── [slug]/page.tsx           # single scenario
│   ├── certificates/
│   │   └── [hash]/
│   │       ├── page.tsx
│   │       └── pdf/route.ts
│   ├── payments/page.tsx
│   ├── payments/[id]/page.tsx
│   ├── live-classes/page.tsx
│   └── live-classes/[id]/page.tsx
├── admin/
│   ├── layout.tsx                        # requireAdmin()
│   ├── page.tsx
│   ├── users/...
│   ├── courses/...
│   ├── payments/...
│   ├── refunds/...
│   ├── simulators/...
│   ├── discount-codes/...
│   ├── audit-log/...
│   └── settings/...
├── api/
│   ├── paymongo/webhook/route.ts
│   └── resend/webhook/route.ts
├── actions/                              # server actions
│   ├── auth.ts
│   ├── checkout.ts
│   ├── enroll.ts
│   ├── refund.ts
│   ├── progress.ts
│   ├── simulator.ts
│   └── admin.ts
└── middleware.ts                         # sets up request container
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

export function buildContainer(): Container { /* ... */ }
export function buildTestContainer(overrides?: Partial<Container>): Container { /* ... */ }
```

### `requestContainer.ts`

```ts
const als = new AsyncLocalStorage<Container>();

export const container = {
  get: (): Container => {
    const c = als.getStore();
    if (!c) throw new Error("No container in scope");
    return c;
  },
  run: <T>(c: Container, fn: () => Promise<T>): Promise<T> =>
    als.run(c, fn) as Promise<T>,
};
```

### `src/middleware.ts`

```ts
export async function middleware(req: NextRequest) {
  return container.run(buildContainer(), () => next(req));
}
```

Use cases and pages get the container via `container.get()`. No globals, no singletons.

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

### Unit tests (Vitest, next to source)
- Every domain function: 100% branch coverage. They are pure.
- Every use case: with `buildTestContainer()`. Cover happy path + every error case + idempotency if applicable.
- Every adapter: integration test against the real SDK (PayMongo sandbox, Resend test mode). Plus unit test for the in-memory fake to confirm the fake matches the port contract.

### Integration tests (Vitest, `tests/integration/`)
- Use case flow: `SignUp → VerifyEmail → StartCheckout → HandlePaymentWebhook → EnrollStudent → MarkLessonComplete → IssueCertificate`. Real Postgres in CI, real PayMongo sandbox for the payment step (or `FakePayMongoGateway` if the sandbox is down).
- Tenant isolation: every server action, every route handler, every Prisma query that touches user-owned data goes through a guard. The test asserts the guard.

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
- `src/domain/`: 100% lines, 100% branches.
- `src/usecases/`: 90% lines, 85% branches.
- `src/lib/`: 90% lines, 80% branches.
- `src/infra/`: 80% lines (integration tests cover the rest).

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

1. **Model the domain.** Add entities and value objects in `src/domain/<feature>/`. No imports from `app/` or `infra/`. Write tests next to the file. 100% branch coverage.
2. **Define the port(s).** Add interfaces in `src/ports/<concern>/`. Document postconditions. Write a `Fake*` in `src/infra/<concern>/fake/`. Test the fake matches the contract.
3. **Write the use case.** Add a class in `src/usecases/<feature>/`. Constructor-inject the ports. Use `Result<T, E>`. Test with `buildTestContainer()`.
4. **Implement the adapter (if needed).** In `src/infra/<concern>/`. Wrap the real SDK. Map to and from domain types. Integration test against the real SDK.
5. **Wire it.** Add to `src/composition/container.ts`. Add to `buildTestContainer()` if relevant.
6. **Expose it.** Add a server action in `src/app/actions/<feature>.ts` (5 lines: parse, call, return) or a page in `src/app/(dashboard)/<feature>/page.tsx`.
7. **Add a story.** `docs/stories/STORY-XXX.md`. Acceptance criteria, files touched, code shape, pitfalls, verification, DoD.
8. **Open a PR.** Conventional commit. `pnpm tsc && pnpm lint && pnpm test && pnpm test:coverage` all green. Story ID in the commit message.

---

## 11. The Sprint Cadence

12 sprints, 60 stories, 60 points. One point per story. Sprint length: ~1 calendar week.

The cadence is:
1. Pick up the next story from `docs/sprint-plan.md`.
2. Open the story file. Read acceptance criteria, files touched, code shape, pitfalls, verification, DoD.
3. Build it. Test it. Commit. PR. Merge.
4. Update `SESSION-HANDOVER.md` "Daily log" with what was done, what was explicitly not done, what the next agent should do.
5. Conventional commit, reference the story ID.

Stories are 1 point by design. If a story is bigger than 1 point, split it. If a story is smaller, that's fine — leave it 1 point and use the slack for the next story.

---

## 12. Conventions Cheat Sheet

| Concern | Convention |
|---------|-----------|
| File names (non-component) | `kebab-case.ts` |
| File names (components) | `PascalCase.tsx` |
| Class names | `PascalCase` |
| Function names | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` for module-level, `camelCase` otherwise |
| Interface vs type | `interface` for ports and shapes, `type` for unions and aliases |
| `readonly` | Every domain entity field. Always. |
| `private constructor` | On every value object. Static factory for construction. |
| `Result<T, E>` | Every port method's return type. |
| Errors | Discriminated unions, `{ kind: "..." , ... }`. |
| Comments | The why, not the what. |
| Tests | Next to the source. `foo.ts` → `foo.test.ts`. |
| Commits | Conventional, story ID in parentheses. |
| Money | `Money` value object, integer minor. |
| Time | `Clock` port, never `new Date()` in business code. |
| IDs | `IdGenerator` port, never `crypto.randomUUID()` in business code. |
| Logging | `Logger` port, never `console.log` in committed code. |
| Errors | `Result.err` across boundaries. Throw only for invariant violations. |
| `any` | Banned. `unknown` + narrowing, or a real type. |
| Emojis in code | Banned. |
| Em-dashes in copy | Banned. Use periods, commas, parentheses. |
| AI-slop phrases | Banned. ESLint rule. |

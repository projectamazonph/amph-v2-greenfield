---
type: entity
title: amph-v2 — API and Schema Reference
domain: ad-training
created: 2026-07-17
updated: 2026-07-17
related: [[amph-v2]], [[amph-academy]], [[projectamazonph]]
---

# amph-v2 — API and Schema Reference

> Complete technical documentation for the greenfield amph-v2 (Next.js 16 App Router, TypeScript strict, Prisma 7 ORM, SOLID five-layer architecture). Covers every port method, every use case input/output/error, every server action, every route handler, and the data flows between them.

---

## 1. Architecture Overview

### 1.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router (RSC + Client Components) |
| Language | TypeScript strict mode |
| Database | PostgreSQL (dev + prod) via Prisma ORM 7 |
| Auth | JWT in HttpOnly cookies (jose) + argon2id passwords |
| Payments | `PaymentGateway` port; PayMongo adapter |
| Email | `EmailSender` port; Resend adapter (React Email templates) |
| PDF | `PdfRenderer` port; `@react-pdf/renderer` adapter |
| Rate limit | `RateLimiter` port; Upstash Redis adapter |
| Storage | Vercel Blob (PDFs) |
| Error tracking | Sentry |
| Logging | Pino |
| Testing | Vitest (unit + integration) + Playwright (e2e) |
| Icons | Phosphor (tree-shaken, no barrel imports) |
| Fonts | Space Grotesk + JetBrains Mono |
| Styling | CSS Modules + design tokens (NO Tailwind) |

### 1.2 Design System: Field Manual

Dense, scannable, utilitarian. Off-white surface (#FAFAF7). Orange accent (#FF6B35). Type-led hierarchy. No glassmorphism, no gradient orbs, no decorative blurs. Full spec: `docs/design-brief.md`.

### 1.3 SOLID Architecture (the five layers)

```
app/         → usecases/ → ports/ ← infra/
              domain/  (imports nothing)
```

- `src/domain/` — entities, value objects, pure functions. No framework imports.
- `src/ports/` — interfaces. Every method returns `Promise<Result<T, E>>`.
- `src/usecases/` — orchestration. One class per use case. Constructor-injected ports.
- `src/infra/` — adapters. The only layer that imports from `next`, `@prisma/client`, `paymongo`, `resend`, `@sentry/*`.
- `src/app/` — Next.js App Router. RSC by default. Server actions are 5-line shims.
- `src/composition/` — the DI container. The only file that knows concrete types.

ESLint boundary rule blocks the wrong dependency direction. ADR-016.

### 1.4 Result type

```ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const Result = {
  ok: <T>(value: T) => ({ ok: true, value }),
  err: <E>(error: E) => ({ ok: false, error }),
  map: <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E>,
  flatMap: <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E>,
  combine: <E, T extends readonly Result<unknown, E>[]>(...rs: T): Result<...>,
};
```

Throw only for invariant violations (programmer errors). All business failures cross layer boundaries as `Result.err`. ADR-014.

### 1.5 Auth flow (defense-in-depth)

```
HTTP request
   │
   ▼
src/middleware.ts
   │  1. JWT verify (jose, HS256, secret from env)
   │  2. Build request container (composition)
   │  3. Set AsyncLocalStorage container
   │  4. If route requires auth and no session, 302 → /signin
   │  5. If route requires admin and role != admin, 403
   │  6. Run next(req) inside container.run()
   ▼
src/app/.../page.tsx (RSC)
   │  7. Get session via container.get() (cached for request)
   │  8. Render. If access policy denies, redirect.
   ▼
src/app/actions/<feature>.ts (server action, on mutation)
   │  9. Parse input with Zod
   │  10. Get container
   │  11. Call use case
   │  12. Return Result -> { ok, value } | { ok, error }
   ▼
src/usecases/<feature>/<UseCase>.ts
   │  13. Use ports only (no direct prisma/paymongo/next)
   │  14. Return Result
   ▼
src/ports/.../  (interface)
   ▼
src/infra/.../  (real adapter, e.g. PrismaCourseRepository)
```

JWT lifetime: 7 days, sliding. Secret in `JWT_SECRET` env var. Cookie name: `amph_session`. `HttpOnly`, `Secure`, `SameSite=Lax`. `Path=/`. The `User.tokenVersion` column (incremented on role change or admin revoke) is checked at verify time to support global sign-out.

---

## 2. Port Reference

Every port method listed here. Full implementations in `src/infra/`. Fakes in `src/infra/<concern>/fake/`. JSDoc on each interface has postconditions.

### 2.1 Repositories

#### `UserRepository`

```ts
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: NewUser): Promise<User>;
  update(id: string, patch: UserPatch, actorId: string): Promise<User>;
  recordStreakVisit(id: string, today: Date): Promise<{ current: number; longest: number; changed: boolean }>;
  list(query: UserListQuery): Promise<{ rows: User[]; total: number }>;
}
```

#### `CourseRepository`

```ts
interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  findBySlug(slug: string): Promise<Course | null>;
  listPublished(): Promise<CourseSummary[]>;
  listForAdmin(query: AdminCourseListQuery): Promise<{ rows: Course[]; total: number }>;
  update(id: string, patch: CoursePatch, actorId: string): Promise<Course>;
}
```

#### `ModuleRepository`

```ts
interface ModuleRepository {
  listByCourse(courseId: string): Promise<Module[]>;
  findById(id: string): Promise<Module | null>;
  create(input: NewModule, actorId: string): Promise<Module>;
  update(id: string, patch: ModulePatch, actorId: string): Promise<Module>;
  reorder(courseId: string, orderedIds: string[], actorId: string): Promise<void>;
}
```

#### `LessonRepository`

```ts
interface LessonRepository {
  listByModule(moduleId: string): Promise<Lesson[]>;
  findById(id: string): Promise<Lesson | null>;
  findBySlug(moduleId: string, slug: string): Promise<Lesson | null>;
  create(input: NewLesson, actorId: string): Promise<Lesson>;
  update(id: string, patch: LessonPatch, actorId: string): Promise<Lesson>;
}
```

#### `EnrollmentRepository`

```ts
interface EnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>;
  findActive(userId: string, courseId: string): Promise<Enrollment | null>;
  listActiveByUser(userId: string): Promise<Enrollment[]>;
  listByCourse(courseId: string, query: Pagination): Promise<{ rows: Enrollment[]; total: number }>;
  create(input: NewEnrollment, actorId: string): Promise<Enrollment>;
  revoke(id: string, reason: string, actorId: string): Promise<Enrollment>;
  updateProgress(id: string, percent: number, lastLessonId: string | null): Promise<Enrollment>;
}
```

#### `PaymentRepository`

```ts
interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByPayMongoId(paymongoPaymentId: string): Promise<Payment | null>;
  findByCheckoutId(checkoutId: string): Promise<Payment | null>;
  listByUser(userId: string, query: PaymentListQuery): Promise<{ rows: Payment[]; total: number }>;
  listAll(query: AdminPaymentListQuery): Promise<{ rows: Payment[]; total: number }>;
  create(input: NewPayment, tx?: PrismaTx): Promise<Payment>;
  update(id: string, patch: PaymentPatch, actorId: string, tx?: PrismaTx): Promise<Payment>;
}
```

#### `RefundRepository`

```ts
interface RefundRepository {
  findById(id: string): Promise<Refund | null>;
  findByPayMongoId(paymongoRefundId: string): Promise<Refund | null>;
  listByUser(userId: string, query: Pagination): Promise<{ rows: Refund[]; total: number }>;
  listByPayment(paymentId: string): Promise<Refund[]>;
  listAll(query: AdminRefundListQuery): Promise<{ rows: Refund[]; total: number }>;
  create(input: NewRefund, tx?: PrismaTx): Promise<Refund>;
  update(id: string, patch: RefundPatch, actorId: string, tx?: PrismaTx): Promise<Refund>;
}
```

#### `ReceiptRepository`

```ts
interface ReceiptRepository {
  findById(id: string): Promise<Receipt | null>;
  findByPaymentId(paymentId: string): Promise<Receipt | null>;
  findByNumber(number: string): Promise<Receipt | null>;
  create(input: NewReceipt, tx?: PrismaTx): Promise<Receipt>;
  markRefunded(id: string, tx?: PrismaTx): Promise<Receipt>;
}
```

#### `DiscountCodeRepository`

```ts
interface DiscountCodeRepository {
  findByCode(code: string): Promise<DiscountCode | null>;
  listAll(query: AdminDiscountListQuery): Promise<{ rows: DiscountCode[]; total: number }>;
  create(input: NewDiscountCode, actorId: string): Promise<DiscountCode>;
  update(id: string, patch: DiscountCodePatch, actorId: string): Promise<DiscountCode>;
  recordUse(codeId: string, userId: string, checkoutId: string, tx?: PrismaTx): Promise<DiscountCodeUse>;
  hasUserUsed(codeId: string, userId: string): Promise<boolean>;
  incrementUses(codeId: string, tx?: PrismaTx): Promise<void>;
}
```

#### `SimulatorScenarioRepository`

```ts
interface SimulatorScenarioRepository {
  findById(id: string): Promise<SimulatorScenario | null>;
  findBySlug(simulatorId: string, slug: string): Promise<SimulatorScenario | null>;
  listActiveBySimulator(simulatorId: string, userTier: Tier): Promise<SimulatorScenario[]>;
  listForAdmin(query: AdminScenarioListQuery): Promise<{ rows: SimulatorScenario[]; total: number }>;
  create(input: NewScenario, actorId: string): Promise<SimulatorScenario>;
  update(id: string, patch: ScenarioPatch, actorId: string): Promise<SimulatorScenario>;
}
```

#### `SimulatorAttemptRepository`

```ts
interface SimulatorAttemptRepository {
  findById(id: string): Promise<SimulatorAttempt | null>;
  listByUser(userId: string, query?: Pagination): Promise<{ rows: SimulatorAttempt[]; total: number }>;
  listByScenario(scenarioId: string, query?: Pagination): Promise<{ rows: SimulatorAttempt[]; total: number }>;
  create(input: NewAttempt): Promise<SimulatorAttempt>;
  complete(id: string, output: SimulatorOutput, score: number): Promise<SimulatorAttempt>;
  statsForScenario(scenarioId: string): Promise<{ attempts: number; avgScore: number; passRate: number }>;
}
```

#### `QuizRepository`

```ts
interface QuizRepository {
  findByModuleId(moduleId: string): Promise<Quiz | null>;
  create(input: NewQuiz, actorId: string): Promise<Quiz>;
  update(id: string, patch: QuizPatch, actorId: string): Promise<Quiz>;
}

interface QuizAttemptRepository {
  findById(id: string): Promise<QuizAttempt | null>;
  listByUserAndQuiz(userId: string, quizId: string, since: Date): Promise<QuizAttempt[]>;
  create(input: NewQuizAttempt): Promise<QuizAttempt>;
  todayCount(userId: string, quizId: string): Promise<number>;
}
```

#### `ProgressRepository`

```ts
interface ProgressRepository {
  record(event: NewProgressEvent): Promise<ProgressEvent>;
  listByUser(userId: string, query: ProgressListQuery): Promise<{ rows: ProgressEvent[]; total: number }>;
  listByLesson(userId: string, lessonId: string): Promise<ProgressEvent[]>;
  xpTotalForUser(userId: string): Promise<number>;
}
```

#### `BadgeRepository`

```ts
interface BadgeRepository {
  findById(id: string): Promise<Badge | null>;
  findBySlug(slug: string): Promise<Badge | null>;
  listActive(): Promise<Badge[]>;
  create(input: NewBadge, actorId: string): Promise<Badge>;
  update(id: string, patch: BadgePatch, actorId: string): Promise<Badge>;
}

interface BadgeAwardRepository {
  findByUserAndBadge(userId: string, badgeId: string): Promise<BadgeAward | null>;
  listByUser(userId: string): Promise<BadgeAward[]>;
  listAllForUser(userId: string): Promise<BadgeAward[]>;
  award(userId: string, badgeId: string): Promise<BadgeAward>;
  revoke(userId: string, badgeId: string, reason: string, actorId: string): Promise<BadgeAward>;
}
```

#### `CertificateRepository`

```ts
interface CertificateRepository {
  findById(id: string): Promise<Certificate | null>;
  findByHash(hash: string): Promise<Certificate | null>;
  listByUser(userId: string): Promise<Certificate[]>;
  create(input: NewCertificate, tx?: PrismaTx): Promise<Certificate>;
  markRevoked(id: string, reason: string, actorId: string): Promise<Certificate>;
}
```

#### `LiveClassRepository`

```ts
interface LiveClassRepository {
  findById(id: string): Promise<LiveClass | null>;
  listUpcoming(now: Date, requiredTier: Tier | null): Promise<LiveClass[]>;
  listPast(requiredTier: Tier | null): Promise<LiveClass[]>;
  listForAdmin(query: AdminLiveClassListQuery): Promise<{ rows: LiveClass[]; total: number }>;
  create(input: NewLiveClass, actorId: string): Promise<LiveClass>;
  update(id: string, patch: LiveClassPatch, actorId: string): Promise<LiveClass>;
  setRecordingUrl(id: string, url: string, actorId: string): Promise<LiveClass>;
}

interface LiveClassRsvpRepository {
  findByUserAndClass(userId: string, liveClassId: string): Promise<LiveClassRsvp | null>;
  listByUser(userId: string): Promise<LiveClassRsvp[]>;
  listByClass(liveClassId: string): Promise<LiveClassRsvp[]>;
  create(userId: string, liveClassId: string): Promise<LiveClassRsvp>;
  markAttended(liveClassId: string, userId: string, actorId: string): Promise<LiveClassRsvp>;
  countForClass(liveClassId: string): Promise<number>;
}
```

#### `AuditLogRepository`

```ts
interface AuditLogRepository {
  record(event: NewAuditEvent): Promise<AuditLog>;
  list(query: AdminAuditListQuery): Promise<{ rows: AuditLog[]; total: number }>;
  listByTarget(targetType: string, targetId: string): Promise<AuditLog[]>;
  exportToCsv(query: AdminAuditListQuery): Promise<string>;
}
```

#### `CheckoutRepository`

```ts
interface CheckoutRepository {
  findById(id: string): Promise<Checkout | null>;
  findByIdempotencyKey(key: string): Promise<Checkout | null>;
  findByPayMongoSessionId(sessionId: string): Promise<Checkout | null>;
  listExpiring(before: Date): Promise<Checkout[]>;
  create(input: NewCheckout): Promise<Checkout>;
  update(id: string, patch: CheckoutPatch): Promise<Checkout>;
  markAbandoned(id: string): Promise<Checkout>;
}
```

#### `SettingsRepository`

```ts
interface SettingsRepository {
  get(): Promise<Settings>;
  update(patch: SettingsPatch, actorId: string): Promise<Settings>;
}
```

### 2.2 Gateways

#### `PaymentGateway`

```ts
interface PaymentGateway {
  createCheckout(input: CheckoutInput): Promise<Result<CheckoutSession, GatewayError>>;
  verifyWebhook(req: WebhookRequest): Promise<Result<WebhookEvent, WebhookError>>;
  refund(input: RefundInput): Promise<Result<RefundResult, GatewayError>>;
  getPayment(paymongoPaymentId: string): Promise<Result<GatewayPayment, GatewayError>>;
}
```

Errors:
- `GatewayError.Network`
- `GatewayError.InvalidRequest`
- `GatewayError.AmountMismatch`
- `GatewayError.PaymentNotFound`
- `GatewayError.AlreadyRefunded`
- `WebhookError.InvalidSignature`
- `WebhookError.UnknownEventType`
- `WebhookError.AmbiguousEvent`

#### `EmailSender`

```ts
interface EmailSender {
  send(input: EmailInput): Promise<Result<EmailSendResult, EmailError>>;
  sendReceipt(user: User, payment: Payment, receipt: Receipt): Promise<Result<EmailSendResult, EmailError>>;
  sendCertificate(user: User, course: Course, certificate: Certificate): Promise<Result<EmailSendResult, EmailError>>;
  sendRefundConfirmation(user: User, payment: Payment, refund: Refund): Promise<Result<EmailSendResult, EmailError>>;
  sendVerificationEmail(user: User, link: string): Promise<Result<EmailSendResult, EmailError>>;
  sendPasswordResetEmail(user: User, link: string): Promise<Result<EmailSendResult, EmailError>>;
  sendAbandonedCheckoutReminder(user: User, checkout: Checkout, course: Course): Promise<Result<EmailSendResult, EmailError>>;
  sendLiveClassReminder(user: User, liveClass: LiveClass, hoursBefore: number): Promise<Result<EmailSendResult, EmailError>>;
}
```

### 2.3 Services

#### `AccessPolicy`

```ts
interface AccessPolicy {
  canAccessCourse(user: UserSnapshot, course: Course): Promise<AccessDecision>;
  canUseSimulator(user: UserSnapshot, sim: Simulator<unknown, unknown>): Promise<AccessDecision>;
  canRequestRefund(user: UserSnapshot, payment: Payment): Promise<AccessDecision>;
  canIssueCertificate(user: UserSnapshot, course: Course): Promise<AccessDecision>;
  canRsvpLiveClass(user: UserSnapshot, liveClass: LiveClass): Promise<AccessDecision>;
  canAccessAdminPanel(user: UserSnapshot): AccessDecision;
}
```

#### `PdfRenderer`

```ts
interface PdfRenderer {
  renderCertificate(input: CertificateInput): Promise<Result<Buffer, PdfError>>;
  renderReceipt(input: ReceiptInput): Promise<Result<Buffer, PdfError>>;
  renderRefundReceipt(input: RefundReceiptInput): Promise<Result<Buffer, PdfError>>;
}
```

#### `PricingService`

```ts
interface PricingService {
  quote(input: PricingInput): Promise<Result<PricingQuote, PricingError>>;
  // PricingQuote = { originalMinor, discountMinor, finalMinor, appliedRule, appliedCode? }
}
```

`appliedRule` is one of: `"base_price"`, `"early_bird"`, `"discount_code"`, `"all_access"`. Disjoint.

#### `CertificateIssuer`

```ts
interface CertificateIssuer {
  verifyHash(input: { hash: string; userId: string; courseId: string; issuedAt: Date }): boolean;
  generateHash(input: { userId: string; courseId: string; issuedAt: Date }): string;
}
```

#### `RateLimiter`

```ts
interface RateLimiter {
  check(bucket: RateLimitBucket, key: string): Promise<Result<RateLimitState, RateLimitError>>;
  // RateLimitState = { remaining: number; resetAt: Date }
}
```

Buckets: `signup_per_ip`, `signin_per_email`, `password_reset_per_email`, `verification_resend_per_email`, `checkout_per_user`, `refund_request_per_user`, `quiz_retry_per_user`, `simulator_attempt_per_user`.

#### `ContentRenderer`

```ts
interface ContentRenderer {
  renderMdx(mdxPath: string, context: RenderContext): Promise<Result<string, RenderError>>;
  // returns rendered HTML string (server-side)
}
```

#### `StreakService`

```ts
interface StreakService {
  recordVisit(input: { userId: string; today: Date; lastVisitAt: Date | null; currentStreak: number; longestStreak: number }):
    { current: number; longest: number; changed: boolean };
}
```

Pure function. No IO. Lives in `src/domain/progress/`.

#### `XPService`

```ts
interface XPService {
  applyEvent(existingXp: number, event: XPEvent): { newXp: number; deltaXp: number };
  computeLevel(totalXp: number): number;  // every 500 XP = 1 level
}
```

Pure function. Lives in `src/domain/progress/`.

#### `ProgressService`

```ts
interface ProgressService {
  recordLessonComplete(input: { userId: string; lessonId: string; courseId: string; occurredAt: Date }):
    Promise<Result<ProgressEvent, ProgressError>>;
  recordQuizAttempt(input: {...}): Promise<Result<ProgressEvent, ProgressError>>;
  recordSimulatorAttempt(input: {...}): Promise<Result<ProgressEvent, ProgressError>>;
  rebuildEnrollmentProgress(enrollmentId: string): Promise<Result<number, ProgressError>>;
}
```

`rebuildEnrollmentProgress` is called by the daily cron and by the post-refund recomputation. It walks the `ProgressEvent` log and rewrites `Enrollment.percentComplete` and `Enrollment.lastLessonId`. The log is the source of truth.

### 2.4 System

```ts
interface Clock { now(): Date; }
interface IdGenerator { new(): string; paymentRef(): string; receiptNumber(): string; }
interface Logger { info(msg: string, ctx?: object): void; warn(...): void; error(...): void; }
interface Tracer { startSpan(name: string, ctx?: object): Span; }
interface EventBus { publish(event: DomainEvent): Promise<void>; }
```

---

## 3. Use Case Reference

One class per use case. The constructor takes ports. The `exec` method takes input and returns `Promise<Result<Output, Error>>`. Errors are discriminated unions.

### 3.1 Auth

#### `SignUp`

```ts
class SignUp {
  constructor(
    private users: UserRepository,
    private email: EmailSender,
    private rateLimiter: RateLimiter,
    private clock: Clock,
    private ids: IdGenerator,
    private logger: Logger,
  ) {}

  exec(input: SignUpInput): Promise<Result<SignUpOutput, SignUpError>>;
}

type SignUpInput = { email: string; password: string; displayName: string; ip: string };
type SignUpOutput = { user: User; verificationLink: string };  // link is for tests; production sends via email
type SignUpError =
  | { kind: "email_taken" }
  | { kind: "validation_failed"; issues: ZodIssue[] }
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "weak_password"; reasons: string[] };
```

#### `SignIn`

```ts
type SignInInput = { email: string; password: string; ip: string; userAgent: string };
type SignInOutput = { user: User; token: string; expiresAt: Date };
type SignInError =
  | { kind: "invalid_credentials" }
  | { kind: "email_not_verified" }
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "validation_failed"; issues: ZodIssue[] };
```

#### `VerifyEmail`, `ResendVerification`, `RequestPasswordReset`, `ResetPassword`, `SignOut` — same shape.

### 3.2 Checkout

#### `StartCheckout`

```ts
type StartCheckoutInput = { userId: string; courseSlug: string; couponCode?: string };
type StartCheckoutOutput = { checkout: Checkout; redirectUrl: string };
type StartCheckoutError =
  | { kind: "course_not_found" }
  | { kind: "already_enrolled" }
  | { kind: "course_not_published" }
  | { kind: "invalid_coupon" }
  | { kind: "coupon_expired" }
  | { kind: "coupon_max_uses" }
  | { kind: "coupon_not_for_course" }
  | { kind: "email_not_verified" };
```

#### `HandlePaymentWebhook`

```ts
type HandlePaymentWebhookInput = { rawBody: string; signature: string; provider: "paymongo" };
type HandlePaymentWebhookOutput = { processed: boolean; eventId: string };
type HandlePaymentWebhookError =
  | { kind: "invalid_signature" }
  | { kind: "unknown_event" }
  | { kind: "checkout_not_found" }
  | { kind: "already_processed"; eventId: string }
  | { kind: "amount_mismatch" }
  | { kind: "internal"; cause: string };
```

### 3.3 Enrollment

#### `EnrollStudent`

```ts
type EnrollStudentInput = { userId: string; courseId: string; source: EnrollmentSource; paymentId?: string };
type EnrollStudentOutput = { enrollment: Enrollment };
type EnrollStudentError =
  | { kind: "already_enrolled" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" };
```

#### `RevokeEnrollment`

```ts
type RevokeEnrollmentInput = { enrollmentId: string; reason: string; actorId: string };
type RevokeEnrollmentError =
  | { kind: "enrollment_not_found" }
  | { kind: "already_revoked" };
```

### 3.4 Refund

#### `RequestRefund`

```ts
type RequestRefundInput = { userId: string; paymentId: string; reason: string };
type RequestRefundError =
  | { kind: "payment_not_found" }
  | { kind: "not_owner" }
  | { kind: "refund_window_expired" }
  | { kind: "already_refunded" }
  | { kind: "gateway_error"; cause: string };
```

#### `AdminIssueRefund`

Same shape, no window check, requires actorId to be admin.

### 3.5 Certificate

#### `IssueCertificate`

```ts
type IssueCertificateInput = { userId: string; courseId: string; enrollmentId: string };
type IssueCertificateError =
  | { kind: "enrollment_not_found" }
  | { kind: "course_not_complete"; percentComplete: number }
  | { kind: "pdf_render_failed"; cause: string }
  | { kind: "already_issued" };
```

#### `VerifyCertificate`, `RevokeCertificate` — same shape.

### 3.6 Simulators

Five use cases, one per simulator. All share the shape:

```ts
type RunSimulatorInput<TIn> = { userId: string; scenarioSlug: string; input: TIn };
type RunSimulatorOutput<TOut> = { attempt: SimulatorAttempt; output: TOut; score: number; feedback: string[] };
type RunSimulatorError =
  | { kind: "scenario_not_found" }
  | { kind: "tier_insufficient" }
  | { kind: "validation_failed"; issues: ZodIssue[] }
  | { kind: "internal"; cause: string };
```

Classes: `RunBidElevator`, `RunStrTriage`, `RunCampaignBuilder`, `RunListingAudit`, `RunKeywordResearch`. Each constructor-injects: `scenarios`, `attempts`, `access`, `progress`, `xp`, `badges`, `logger`. The pure scoring function lives in `src/domain/simulators/<name>.ts` and is called by the use case after access checks.

### 3.7 Progress

- `MarkLessonComplete` — checks enrollment is active, creates `LESSON_COMPLETED` event, updates `Enrollment.percentComplete` and `lastLessonId`, awards XP, checks for badge criteria.
- `RecordQuizAttempt` — creates `QuizAttempt` row, creates `QUIZ_PASSED` or `QUIZ_FAILED` event, awards XP on pass, checks for badge criteria.
- `RecordStreakVisit` — pure StreakService call, persists, creates `STREAK_VISIT` event.
- `RecordSimulatorAttempt` — wraps a simulator run use case to record the attempt.

### 3.8 Badges

- `AwardBadge` — checks criteria, creates `BadgeAward`, creates `XP_AWARDED` event.
- `RevokeBadge` — admin only, audit-logged.
- `ListUserBadges` — read-only.

### 3.9 Admin

- `AdminUpdateUser` — change role, audit-logged.
- `AdminCreateDiscountCode`, `AdminUpdateDiscountCode`, `AdminDeactivateDiscountCode`.
- `AdminUpdateCourse`, `AdminUpdateModule`, `AdminUpdateLesson`.
- `AdminUpdatePricingSettings` — updates `Settings`.
- `AdminCreateSimulatorScenario`, `AdminUpdateSimulatorScenario`.
- `AdminCreateLiveClass`, `AdminUpdateLiveClass`, `AdminSetLiveClassRecording`.
- `AdminMarkLiveClassAttendance`.
- `AdminExportAuditLog` — CSV download.

All admin use cases require actorId, write to `AuditLog`, and return `Result`.

---

## 4. Server Action Reference

Server actions are 5–10 line shims. They live in `src/app/actions/`. The pattern is:

```ts
"use server";
import { z } from "zod";
import { container } from "@/composition/requestContainer";
import { getSession } from "@/lib/auth";

const Input = z.object({ /* ... */ });

export async function someAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false, error: { kind: "unauthorized" } };
  const input = Input.parse(Object.fromEntries(formData));
  const c = container.get();
  return new SomeUseCase(/* inject from c */).exec({ ...input, actorId: session.userId });
}
```

### 4.1 Auth actions

`src/app/actions/auth.ts`:
- `signUpAction(formData)` — calls `SignUp`.
- `signInAction(formData)` — calls `SignIn`. On success, sets the JWT cookie.
- `signOutAction()` — clears the cookie.
- `verifyEmailAction(token)` — calls `VerifyEmail`.
- `resendVerificationAction()` — calls `ResendVerification`.
- `requestPasswordResetAction(email)` — calls `RequestPasswordReset`.
- `resetPasswordAction(token, newPassword)` — calls `ResetPassword`.

### 4.2 Checkout actions

`src/app/actions/checkout.ts`:
- `startCheckoutAction(formData)` — calls `StartCheckout`. Returns `{ ok, redirectUrl }`.
- `applyCouponAction(checkoutId, code)` — calls `StartCheckout` again with the coupon.

### 4.3 Progress actions

`src/app/actions/progress.ts`:
- `markLessonCompleteAction(lessonId)` — calls `MarkLessonComplete`.
- `recordQuizAttemptAction(quizId, answers)` — calls `RecordQuizAttempt`.
- `recordStreakVisitAction()` — called on every dashboard render by the RSC (idempotent).

### 4.4 Simulator actions

`src/app/actions/simulator.ts`:
- `runBidElevatorAction(scenarioSlug, input)` — calls `RunBidElevator`.
- `runStrTriageAction(...)`, `runCampaignBuilderAction(...)`, `runListingAuditAction(...)`, `runKeywordResearchAction(...)` — same shape.

### 4.5 Refund actions

`src/app/actions/refund.ts`:
- `requestRefundAction(paymentId, reason)` — calls `RequestRefund`.

### 4.6 Admin actions

`src/app/actions/admin.ts`:
- `adminUpdateUserAction(userId, patch)` — calls `AdminUpdateUser`.
- `adminCreateDiscountCodeAction(input)` — calls `AdminCreateDiscountCode`.
- `adminUpdateCourseAction(courseId, patch)` — calls `AdminUpdateCourse`.
- ... one per admin use case.

---

## 5. Route Handler Reference

Route handlers exist only for webhooks. Two of them.

### 5.1 `POST /api/paymongo/webhook`

```ts
// src/app/api/paymongo/webhook/route.ts
import { container } from "@/composition/requestContainer";
import { HandlePaymentWebhook } from "@/usecases/checkout/HandlePaymentWebhook";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paymongo-signature") ?? "";
  const c = container.get();
  const result = await new HandlePaymentWebhook(c).exec({
    rawBody,
    signature,
    provider: "paymongo",
  });
  if (!result.ok) {
    if (result.error.kind === "invalid_signature") return new Response(null, { status: 401 });
    if (result.error.kind === "already_processed") return Response.json({ ok: true, idempotent: true });
    return new Response(null, { status: 500 });
  }
  return Response.json({ ok: true });
}
```

Events handled: `payment.paid`, `payment.failed`, `checkout.session.expired`, `refund.created`, `refund.updated`.

### 5.2 `POST /api/resend/webhook`

Same shape. Events: `email.delivered`, `email.bounced`, `email.complained`. Updates `EmailEvent` log (audit). Currently we don't bounce users on email bounces (could be spam filter false positives); we surface them in admin.

### 5.3 `GET /certificates/[hash]/pdf`

```ts
// src/app/(dashboard)/certificates/[hash]/pdf/route.ts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const c = container.get();
  const result = await new VerifyCertificate(c).exec({ hash });
  if (!result.ok) return new Response("Not found", { status: 404 });
  const pdf = await fetch(result.value.certificate.pdfUrl);
  return new Response(pdf.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="amph-certificate-${hash}.pdf"`,
    },
  });
}
```

### 5.4 `GET /api/health`

Lightweight health check for uptime monitoring. Returns `{ ok: true, version, uptime }`. No auth.

---

## 6. Tool Engine Reference

Each simulator has a domain module in `src/domain/simulators/<name>.ts` with a pure scoring function. The use case in `src/usecases/simulators/` is a thin wrapper.

### 6.1 Bid Elevator

Input: `ReadonlyArray<KeywordRow>` where `KeywordRow = { keyword, spend: Money, sales: Money, clicks, impressions }`. Rules: `BidRule = { targetAcos: number; wastedSpendCpcCeiling: number }`. Output: `ReadonlyArray<BidRecommendation>` discriminated by `kind: "lower" | "raise" | "pause" | "keep"`. Pure function `recommendBids(rows, rules)`.

### 6.2 STR Triage

Input: same `KeywordRow` shape. Output: `ReadonlyArray<TriageBucket>` where `TriageBucket = { keyword, bucket: "keep" | "pause" | "optimize", confidence }`. Pure function `triageSearchTerms(rows, rules)`. Ground truth comes from the scenario.

### 6.3 Campaign Builder

Input: a campaign structure (a tree of `AdGroup` → `Keyword` → `Bid`). Output: a score (0–100) and a list of `CheckResult` (per-check pass/fail + reason). Pure function `evaluateCampaignStructure(input, rules)`.

### 6.4 Listing Audit

Input: a `Listing` (title, bullets, description, backend keywords, image count, etc.). Output: a score and per-section check results. Pure function `auditListing(listing, rules)`.

### 6.5 Keyword Research

Input: a seed term. Output: a list of `KeywordSuggestion = { keyword, matchType, estBid: Money, rationale }`. Pure function `expandKeyword(seed, rules)`. No external API.

---

## 7. Data Flow Examples

### 7.1 First-time signup → first lesson

```
1. POST /signup (form)
2. signUpAction(formData)
3. SignUp.exec({ email, password, displayName, ip })
4. UserRepository.create(input)        ← PrismaUserRepository
5. EmailSender.sendVerificationEmail  ← ResendEmailSender
6. Set JWT cookie, redirect /dashboard
7. User clicks lesson
8. GET /courses/ppc-foundations/lessons/welcome
9. RSC: container.get().courses.findBySlug("ppc-foundations")
10. container.get().lessons.findBySlug(moduleId, "welcome")
11. container.get().contentRenderer.renderMdx("content/curriculum/modules/0/1/welcome.mdx", ctx)
12. Render
13. Scroll to bottom: markLessonCompleteAction(lessonId)
14. MarkLessonComplete.exec
15. ProgressRepository.record(LESSON_COMPLETED)
16. XPService.applyEvent(currentXp, { kind: "lesson_complete", xpDelta: 50 })
17. ProgressRepository.record(XP_AWARDED)
18. BadgeRepository.checkCriteria(user, badges)
19. BadgeAwardRepository.award(user, badge) if criteria met
20. revalidate path
```

### 7.2 PayMongo webhook

```
1. PayMongo POST /api/paymongo/webhook with payment.paid
2. Route handler reads raw body + signature
3. HandlePaymentWebhook.exec({ rawBody, signature, provider: "paymongo" })
4. PaymentGateway.verifyWebhook → WebhookEvent (PayMongoGateway)
5. CheckoutRepository.findByPayMongoSessionId(event.data.attributes.checkout_session_id)
6. WebhookEventRepository.findByEventId(event.id)  // idempotency
   → if found and processed, return Result.err({ kind: "already_processed" })
7. In Prisma transaction:
   a. PaymentRepository.create({ amountMinor, method, status: COMPLETED, ... })
   b. ReceiptRepository.create({ number, paymentId })
   c. EnrollStudent.exec({ userId, courseId, source: CHECKOUT, paymentId })
   d. Receipt.pdfUrl ← PdfRenderer.renderReceipt(...)
   e. ReceiptRepository.update with pdfUrl
   f. WebhookEventRepository.create({ eventId, processedAt })
8. Outside transaction:
   a. EmailSender.sendReceipt(user, payment, receipt)
   b. XPService.applyEvent → record XP_AWARDED event
   c. Badge check: "New enrollment" badge
9. Return 200 OK
```

---

## 8. Error Envelope

Server actions return:

```ts
type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { kind: string; [k: string]: unknown } };
```

The client (`'use client'` components) renders UI based on `error.kind`. Common kinds:
- `"unauthorized"` — redirect to /signin
- `"forbidden"` — render Forbidden component
- `"validation_failed"` — render field-level errors
- `"rate_limited"` — render countdown
- `"not_found"` — render EmptyState
- `"conflict"` — render Conflict with retry
- `"internal"` — log to Sentry, render generic error

The `error.kind` values are exhaustively mapped in `src/lib/errorKinds.ts`. New use cases add to that map. The ESLint rule `local/no-unmapped-error-kind` fails the build if a kind is added without a mapping.

---

## 9. Versioning

- API version: implicit (we have no public REST API; the server action surface is the API).
- Webhook version: per-provider. `payment.paid` v1 today; v2 when PayMongo ships it (would add a new event handler in `HandlePaymentWebhook`).
- PDF format version: stored on `Certificate.pdfVersion` (currently always `1`). On re-issue with a new version, old PDFs are kept; new issues use the new version. The certificate page renders the version label.
- Schema migrations: append-only Prisma migrations. Destructive changes use the two-phase pattern documented in `docs/db-schema.md` §"Migrations".

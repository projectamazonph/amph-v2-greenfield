# Database Schema — Project Amazon PH Academy v2

**Date:** 2026-07-17
**Owner:** Ryan Roland Dabao
**Status:** Approved (greenfield, day-1 design)

This document is the source of truth for the Prisma schema. Every model, every field, every index, every constraint is specified here. The actual `schema.prisma` is generated from this doc — they must match.

---

## Principles

1. **PostgreSQL-compatible.** Postgres in dev and production. No SQLite-specific features.
2. **Soft-delete on every mutable table.** `deletedAt DateTime?` filtered by default. Hard delete only via admin action with audit-log entry.
3. **Audit columns on every mutable table.** `createdById`, `updatedById`, `createdAt`, `updatedAt`. `createdById` is nullable for system-created rows.
4. **Compound indexes on every hot read path.** Specified per model below.
5. **JSON columns have typed shapes.** Documented in `src/domain/.../*.ts`. Zod-validated on read.
6. **No `orgId`.** Single-tenant. ADR-015.
7. **Enums for all state machines.** Never `String` with comment-listing valid values.
8. **CUIDs for primary keys.** Not UUIDs, not auto-increment. Sortable, URL-safe, Prisma-native.
9. **Money is integer minor units (centavos).** `Int` columns. Never `Float`, never `Decimal`. ADR-018.
10. **Append-only `ProgressEvent` log.** The source of truth for all learning activity. Denormalized counters are derived.

---

## Models

### User

Authentication and identity.

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerifiedAt   DateTime?
  passwordHash      String    // argon2id
  displayName       String
  role              UserRole  @default(STUDENT)
  currentStreakDays Int       @default(0)
  longestStreakDays Int       @default(0)
  lastStreakVisitAt DateTime?
  deletedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  createdById       String?
  updatedById       String?

  enrollments       Enrollment[]
  payments          Payment[]
  refunds           Refund[]
  attempts          SimulatorAttempt[]
  progress          ProgressEvent[]
  quizAttempts      QuizAttempt[]
  badges            BadgeAward[]
  certificates      Certificate[]
  auditLogs         AuditLog[]    @relation("AuditActor")
  passwordResets    PasswordReset[]
  emailVerifications EmailVerification[]

  @@index([email])
  @@index([role, deletedAt])
  @@index([createdAt])
}

enum UserRole {
  STUDENT
  ADMIN
  SUPER_ADMIN
}
```

### Course

```prisma
model Course {
  id              String     @id @default(cuid())
  slug            String     @unique
  title           String
  subtitle        String?
  description     String     @db.Text
  heroImageUrl    String?
  instructorName  String
  instructorBio   String?    @db.Text
  pricingTierId   String     @unique
  pricingTier     PricingTier @relation(fields: [pricingTierId], references: [id])
  isPublished     Boolean    @default(false)
  isAllAccess     Boolean    @default(false)  // true for the all-access pass
  displayOrder    Int        @default(0)
  deletedAt       DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  createdById     String?
  updatedById     String?

  modules         Module[]
  enrollments     Enrollment[]
  payments        Payment[]   // via Checkout -> Course? No, see below
  discountCodes   DiscountCode[] @relation("DiscountCodeCourses")
  certificates    Certificate[]

  @@index([isPublished, displayOrder])
  @@index([pricingTierId])
}
```

### PricingTier

Pricing is on the tier, not the course. All-access pass points to a special tier.

```prisma
model PricingTier {
  id              String    @id @default(cuid())
  slug            String    @unique  // "foundations", "mastery", "ultimate", "all-access"
  name            String
  priceMinor      Int       // integer centavos
  currency        String    @default("PHP")
  isActive        Boolean   @default(true)
  displayOrder    Int       @default(0)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdById     String?
  updatedById     String?

  course          Course?
  enrollments     Enrollment[]

  @@index([isActive, displayOrder])
}
```

### Module

```prisma
model Module {
  id            String   @id @default(cuid())
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  slug          String
  number        Int      // 0, 1, 2, ...; ordering within a course
  title         String
  description   String?  @db.Text
  unlocksAt     DateTime?  // null = unlocked by default; set for scheduled drops
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String?
  updatedById   String?

  lessons       Lesson[]
  quiz          Quiz?

  @@unique([courseId, slug])
  @@unique([courseId, number])
  @@index([courseId, number])
}
```

### Lesson

```prisma
model Lesson {
  id                String   @id @default(cuid())
  moduleId          String
  module            Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  slug              String
  number            Int      // ordering within a module
  title             String
  type              LessonType
  estimatedMinutes  Int
  xpReward          Int      @default(10)
  mdxPath           String   // repo-relative path under content/curriculum/
  displayOrder      Int      @default(0)
  deletedAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String?
  updatedById       String?

  progressEvents    ProgressEvent[]

  @@unique([moduleId, slug])
  @@unique([moduleId, number])
  @@index([moduleId, number])
}

enum LessonType {
  VIDEO
  READING
  PRACTICE
  CASE_STUDY
  DECISION
}
```

### Quiz

```prisma
model Quiz {
  id            String   @id @default(cuid())
  moduleId      String   @unique
  module        Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  passingScore  Int      @default(80)  // percentage
  maxAttemptsPerDay Int  @default(3)
  questions     Json     // see QuizQuestion schema in src/domain/courses/Quiz.ts
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String?
  updatedById   String?

  attempts      QuizAttempt[]
}
```

### QuizAttempt

```prisma
model QuizAttempt {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizId        String
  quiz          Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  score         Int      // percentage 0-100
  passed        Boolean
  answers       Json     // user's answers
  startedAt     DateTime
  completedAt   DateTime @default(now())
  createdAt     DateTime @default(now())

  @@index([userId, quizId, completedAt])
  @@index([quizId, completedAt])
}
```

### Enrollment

```prisma
model Enrollment {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId        String
  course          Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  pricingTierId   String
  pricingTier     PricingTier      @relation(fields: [pricingTierId], references: [id])
  status          EnrollmentStatus @default(ACTIVE)
  source          EnrollmentSource @default(CHECKOUT)
  percentComplete Int              @default(0)
  lastLessonId    String?
  enrolledAt      DateTime         @default(now())
  revokedAt       DateTime?
  revokedReason   String?
  revokedById     String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  createdById     String?
  updatedById     String?

  certificates    Certificate[]

  @@unique([userId, courseId])
  @@index([userId, status])
  @@index([courseId, status])
}

enum EnrollmentStatus {
  ACTIVE
  REVOKED
}

enum EnrollmentSource {
  CHECKOUT
  ADMIN_GRANT
  ALL_ACCESS
}
```

### Checkout

```prisma
model Checkout {
  id                String         @id @default(cuid())
  userId            String
  courseId          String
  course            Course         @relation(fields: [courseId], references: [id])
  idempotencyKey    String         @unique  // sent to PayMongo as the `reference` field
  status            CheckoutStatus @default(PENDING)
  amountMinor       Int
  currency          String         @default("PHP")
  discountCodeId    String?
  discountCode      DiscountCode?  @relation(fields: [discountCodeId], references: [id])
  paymongoSessionId String?        @unique
  paymongoUrl       String?
  expiresAt         DateTime       // createdAt + 30 min
  completedAt       DateTime?
  abandonedEmailSentAt DateTime?
  failureReason     String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  payment           Payment?

  @@index([userId, status])
  @@index([status, expiresAt])
  @@index([createdAt])
}

enum CheckoutStatus {
  PENDING
  COMPLETED
  EXPIRED
  FAILED
  ABANDONED
}
```

### Payment

```prisma
model Payment {
  id                String         @id @default(cuid())
  userId            String
  user              User           @relation(fields: [userId], references: [id])
  checkoutId        String         @unique
  checkout          Checkout       @relation(fields: [checkoutId], references: [id])
  amountMinor       Int
  currency          String         @default("PHP")
  method            PaymentMethod
  status            PaymentStatus  @default(PENDING)
  paymongoPaymentId String?        @unique
  paymongoSourceId  String?
  paymongoIntentId  String?
  description       String
  paidAt            DateTime?
  refundedAt        DateTime?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  createdById       String?
  updatedById       String?

  receipt           Receipt?
  refunds           Refund[]

  @@index([userId, status, createdAt])
  @@index([status, createdAt])
}

enum PaymentMethod {
  GCASH
  MAYA
  GRABPAY
  CARD
  BANK_TRANSFER
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  FLAGGED
}
```

### Refund

```prisma
model Refund {
  id                String       @id @default(cuid())
  userId            String
  user              User         @relation(fields: [userId], references: [id])
  paymentId         String
  payment           Payment      @relation(fields: [paymentId], references: [id])
  amountMinor       Int
  currency          String       @default("PHP")
  reason            String
  status            RefundStatus @default(PENDING)
  isAdminOverride   Boolean      @default(false)
  paymongoRefundId  String?      @unique
  requestedAt       DateTime     @default(now())
  completedAt       DateTime?
  failureReason     String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  createdById       String?
  updatedById       String?

  @@index([userId, status])
  @@index([paymentId])
  @@index([status, requestedAt])
}

enum RefundStatus {
  PENDING
  COMPLETED
  FAILED
  TIMEOUT
}
```

### Receipt

```prisma
model Receipt {
  id            String   @id @default(cuid())
  paymentId     String   @unique
  payment       Payment  @relation(fields: [paymentId], references: [id])
  number        String   @unique  // e.g. "AMPH-2026-000123"
  pdfUrl        String
  isRefunded    Boolean  @default(false)
  revokedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([number])
}
```

### DiscountCode

```prisma
model DiscountCode {
  id                  String           @id @default(cuid())
  code                String           @unique
  type                DiscountCodeType
  value               Int              // percent: 1-100; fixed: integer centavos
  validCourses        Course[]         @relation("DiscountCodeCourses")
  validFrom           DateTime?
  validUntil          DateTime?
  maxUses             Int?
  currentUses         Int              @default(0)
  singleUsePerUser    Boolean          @default(true)
  stacksWithEarlyBird Boolean          @default(false)
  isActive            Boolean          @default(true)
  deletedAt           DateTime?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  createdById         String?
  updatedById         String?

  uses                DiscountCodeUse[]
  checkouts           Checkout[]

  @@index([isActive, validFrom, validUntil])
}

enum DiscountCodeType {
  PERCENT
  FIXED
}

model DiscountCodeUse {
  id              String       @id @default(cuid())
  discountCodeId  String
  discountCode    DiscountCode @relation(fields: [discountCodeId], references: [id])
  userId          String
  checkoutId      String       @unique
  usedAt          DateTime     @default(now())

  @@unique([discountCodeId, userId])
  @@index([userId])
}
```

### Simulator and Scenario

```prisma
model SimulatorScenario {
  id              String       @id @default(cuid())
  simulatorId     String       // "bid-elevator", "str-triage", "campaign-builder", "listing-audit", "keyword-research"
  slug            String       @unique
  title           String
  description     String       @db.Text
  difficulty      Difficulty
  category        String       // "kitchen", "electronics", "garden", "fitness", "beauty", etc.
  requiredTier    PricingTier  @relation(fields: [requiredTierId], references: [id])
  requiredTierId  String
  inputPayload    Json         // scenario input
  groundTruth     Json         // expected output / bucketing
  estimatedMinutes Int         @default(15)
  xpReward        Int          @default(25)
  isActive        Boolean      @default(true)
  displayOrder    Int          @default(0)
  deletedAt       DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  createdById     String?
  updatedById     String?

  attempts        SimulatorAttempt[]

  @@unique([simulatorId, slug])
  @@index([simulatorId, isActive, displayOrder])
  @@index([requiredTierId, isActive])
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}
```

### SimulatorAttempt

```prisma
model SimulatorAttempt {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarioId    String
  scenario      SimulatorScenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  input         Json
  output        Json
  score         Int?     // percentage 0-100, null while in progress
  startedAt     DateTime
  completedAt   DateTime?
  createdAt     DateTime @default(now())

  @@index([userId, scenarioId, createdAt])
  @@index([scenarioId, score])
}
```

### ProgressEvent (append-only)

The source of truth for all learning activity. Denormalized counters on `Enrollment` are derived from this log and rebuilt by a daily job.

```prisma
model ProgressEvent {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId      String?
  lesson        Lesson?        @relation(fields: [lessonId], references: [id])
  courseId      String         // denormalized for fast queries
  kind          ProgressKind
  payload       Json           // event-specific data
  occurredAt    DateTime       @default(now())
  createdAt     DateTime       @default(now())

  @@index([userId, courseId, occurredAt])
  @@index([lessonId, occurredAt])
  @@index([kind, occurredAt])
}

enum ProgressKind {
  LESSON_STARTED
  LESSON_COMPLETED
  QUIZ_PASSED
  QUIZ_FAILED
  SIMULATOR_COMPLETED
  STREAK_VISIT
  XP_AWARDED
}
```

### Badge and BadgeAward

```prisma
model Badge {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  description   String
  iconName      String   // Phosphor icon name, e.g. "Trophy", "Star"
  criteria      Json     // machine-readable criteria; see src/domain/badges/criteria.ts
  isActive      Boolean  @default(true)
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String?
  updatedById   String?

  awards        BadgeAward[]
}

model BadgeAward {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeId       String
  badge         Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  awardedAt     DateTime @default(now())
  revokedAt     DateTime?
  revokedReason String?
  createdAt     DateTime @default(now())

  @@unique([userId, badgeId])
  @@index([userId, awardedAt])
}
```

### Certificate

```prisma
model Certificate {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  enrollmentId  String
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  hash          String   @unique  // 16-char URL-safe
  pdfUrl        String
  isRevoked     Boolean  @default(false)
  revokedAt     DateTime?
  revokedReason String?
  issuedAt      DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId, issuedAt])
  @@index([courseId])
}
```

### LiveClass and RSVP

```prisma
model LiveClass {
  id            String   @id @default(cuid())
  title         String
  description   String   @db.Text
  scheduledAt   DateTime
  durationMinutes Int    @default(60)
  zoomUrl       String
  capacity      Int      @default(100)
  requiredTierId String
  requiredTier   PricingTier @relation(fields: [requiredTierId], references: [id])
  recordingUrl  String?
  isCancelled   Boolean  @default(false)
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String?
  updatedById   String?

  rsvps         LiveClassRsvp[]

  @@index([scheduledAt])
  @@index([requiredTierId, scheduledAt])
}

model LiveClassRsvp {
  id            String   @id @default(cuid())
  userId        String
  liveClassId   String
  liveClass     LiveClass @relation(fields: [liveClassId], references: [id], onDelete: Cascade)
  rsvpedAt      DateTime @default(now())
  attendedAt    DateTime?
  createdAt     DateTime @default(now())

  @@unique([userId, liveClassId])
  @@index([liveClassId])
}
```

### Auth (PasswordReset, EmailVerification, Session)

```prisma
model PasswordReset {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash     String   @unique  // sha256 of the token
  expiresAt     DateTime
  usedAt        DateTime?
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model EmailVerification {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash     String   @unique
  expiresAt     DateTime
  usedAt        DateTime?
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

(Sessions are JWT in HttpOnly cookies. There is no `Session` table; revocation happens via a per-user `tokenVersion` column on `User`. Increment to revoke all sessions.)

### AuditLog

Append-only. Every admin mutation, every auth event, every payment event.

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  actorId       String?  // null for system events
  actor         User?    @relation("AuditActor", fields: [actorId], references: [id])
  action        String   // "user.role_changed", "course.updated", "refund.override", etc.
  targetType    String?  // "User", "Course", "Payment", etc.
  targetId      String?
  metadata      Json?
  ip            String?
  userAgent     String?
  occurredAt    DateTime @default(now())
  createdAt     DateTime @default(now())

  @@index([actorId, occurredAt])
  @@index([action, occurredAt])
  @@index([targetType, targetId, occurredAt])
}
```

### Settings

Single-row table. The admin's `Settings` page writes to row `id = "singleton"`.

```prisma
model Settings {
  id                    String   @id @default("singleton")
  earlyBirdLimit        Int      @default(30)
  earlyBirdPriceMinor   Int      @default(49900)  // ₱499
  refundWindowDays      Int      @default(7)
  businessName          String   @default("Project Amazon PH Academy")
  businessTin           String?
  businessAddress       String?
  businessEmail         String?
  supportEmail          String   @default("support@projectamazon.ph")
  featureFlags          Json     @default("{}")
  updatedAt             DateTime @updatedAt
  updatedById           String?
}
```

---

## Indexes (summary)

Hot read paths and their indexes:

| Query | Index |
|-------|-------|
| `User.findByEmail` | `User.email` unique |
| `User.list({ role, deletedAt })` | `User(role, deletedAt)` |
| `Course.listPublished` | `Course(isPublished, displayOrder)` |
| `Enrollment.findActive(userId, courseId)` | `Enrollment(userId, status)` |
| `Enrollment.listByCourse(courseId, status)` | `Enrollment(courseId, status)` |
| `Checkout.findExpiring(now)` | `Checkout(status, expiresAt)` |
| `Payment.listByUser(userId, status, since)` | `Payment(userId, status, createdAt)` |
| `Payment.findByPayMongoId` | `Payment.paymongoPaymentId` unique |
| `SimulatorScenario.listActive(simulatorId)` | `SimulatorScenario(simulatorId, isActive, displayOrder)` |
| `ProgressEvent.listByUser(userId, courseId, since)` | `ProgressEvent(userId, courseId, occurredAt)` |
| `BadgeAward.findByUser(userId)` | `BadgeAward(userId, awardedAt)` |
| `Certificate.findByHash` | `Certificate.hash` unique |
| `LiveClass.listUpcoming` | `LiveClass(scheduledAt)` |
| `AuditLog.listByActor(actorId, since)` | `AuditLog(actorId, occurredAt)` |
| `AuditLog.listByTarget(targetType, targetId, since)` | `AuditLog(targetType, targetId, occurredAt)` |

---

## Migrations

- `prisma migrate dev` locally. `prisma migrate deploy` in production.
- Every migration is reviewed for:
  - No `Float` for money.
  - New tables follow the audit-column + soft-delete conventions.
  - New indexes match a documented hot read path.
  - No SQLite-specific features.
- Migrations are append-only. Never edit a migration after it has run in production.
- For destructive changes: ship a two-phase migration. Phase 1: add the new shape, dual-write. Phase 2: cut over reads, drop the old shape. (Used for: pricing tier refactors, certificate hash format changes.)

## JSON Column Schemas

Every JSON column has a Zod schema in `src/domain/`. Reading a row validates. Writing a row validates. Validation failures are bugs — the app should never produce invalid JSON, and if it does, we want to know.

Documented in `src/domain/.../json-schemas.ts` (one file, all schemas exported). Examples:

- `Quiz.questions` — array of `{ id, prompt, choices, correctChoiceId, explanation }`.
- `QuizAttempt.answers` — array of `{ questionId, chosenChoiceId, isCorrect }`.
- `SimulatorScenario.inputPayload` — discriminated union by `simulatorId`.
- `SimulatorScenario.groundTruth` — discriminated union by `simulatorId`.
- `SimulatorAttempt.output` — discriminated union by `simulatorId`.
- `Badge.criteria` — discriminated union by criteria kind.
- `Settings.featureFlags` — `Record<string, boolean>`.
- `AuditLog.metadata` — `Record<string, unknown>` (untyped by design; action-specific schemas in `src/domain/audit/`).

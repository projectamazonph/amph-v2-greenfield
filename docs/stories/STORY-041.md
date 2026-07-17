# STORY-041 — Certificate Model + Repo + IssueCertificate Use Case

## Status

- **Story**: STORY-041
- **Sprint**: 9 — Certificates + Email
- **Points**: 1
- **Status**: In Progress

## Overview

Lay the foundation for the certificate feature: domain entity, repository
port, infra adapters (in-memory + Prisma), Prisma schema migration, and the
`IssueCertificate` use case. PDF rendering (STORY-042), the public view
(STORY-043), and revocation (STORY-044) all build on top of this.

**Scope of this story:**
- `Certificate` domain entity
- `ICertificateRepository` port
- `InMemoryCertificateRepository` + `PrismaCertificateRepository`
- `IssueCertificate` use case — issue a certificate to a user for a course
- `Certificate` Prisma model + migration
- Wire into the DI container (production + test)

**Out of scope for this story (separate follow-ons):**
- PDF rendering — STORY-042
- Public `/certificates/[hash]` view + `/pdf` route — STORY-043
- Revocation on refund — STORY-044
- Email notification on issue — STORY-045
- Admin reissue / re-print — separate story (admin panel, STORY-050)

## 1. Domain Entity

```typescript
// src/domain/entities/Certificate.ts

export type CertificateStatus = "active" | "revoked";

export interface Certificate {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly verificationHash: string;  // 64-char hex (sha256 of id+userId+courseId+issuedAt)
  readonly issuedAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: string | null;
  readonly status: CertificateStatus;
}

export type CertificateError =
  | { kind: "invalid_verification_hash" }
  | { kind: "invalid_status_transition"; from: CertificateStatus; to: CertificateStatus }
  | { kind: "db_error"; message: string };

export function createCertificate(params: {
  id: string;
  userId: string;
  courseId: string;
  verificationHash: string;
  issuedAt: Date;
}): Result<Certificate, CertificateError>;

export function revokeCertificate(cert: Certificate, at: Date, reason: string): Result<Certificate, CertificateError>;
```

The `verificationHash` is a public, shareable identifier (used in URLs like
`/certificates/{hash}`) — so it is **not** a secret. It's just a stable
fingerprint of `(id, userId, courseId, issuedAt)` so the public view can
re-derive it. STORY-042 wraps the same hash into the QR code on the PDF.

The hash is generated at issue time (in the use case), not in the entity —
the domain layer just validates the shape. The use case uses
`node:crypto.createHash("sha256")` via a port adapter so the algorithm
isn't a domain concern.

## 2. Repository Port

```typescript
// src/ports/repositories/ICertificateRepository.ts

export type CertificateError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface ICertificateRepository {
  create(cert: Certificate): Promise<Result<Certificate, CertificateError>>;
  findById(id: string): Promise<Result<Certificate | null, CertificateError>>;
  findByVerificationHash(hash: string): Promise<Result<Certificate | null, CertificateError>>;
  findByUserId(userId: string): Promise<Result<readonly Certificate[], CertificateError>>;
  update(cert: Certificate): Promise<Result<Certificate, CertificateError>>;
}
```

## 3. Prisma Schema

```prisma
model Certificate {
  id               String   @id  // ULID
  userId           String
  courseId         String
  verificationHash String   @unique
  issuedAt         DateTime @default(now())
  revokedAt        DateTime?
  revokedReason    String?
  status           String   @default("active")  // active | revoked

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])  // one cert per (user, course)
  @@index([userId])
  @@index([verificationHash])
  @@map("certificates")
}
```

Plus add `certificates Certificate[]` to the `User` and `Course` models.

Run `npx prisma migrate dev` to generate the migration.

## 4. Use Case — IssueCertificate

```typescript
// src/usecases/IssueCertificate.ts

export interface IssueCertificateInput {
  userId: string;
  courseId: string;
}

export type IssueCertificateError =
  | { kind: "course_not_found" }
  | { kind: "enrollment_not_found" }
  | { kind: "course_not_completed" }
  | { kind: "already_issued" }
  | { kind: "db_error"; message: string };

export type IssueCertificateResult = Result<
  { certificate: Certificate; isReissue: false },
  IssueCertificateError
>;

export interface IssueCertificateDeps {
  enrollmentRepo: IEnrollmentRepository;
  courseRepo: CourseRepository;
  certificateRepo: ICertificateRepository;
  hashGen: CertificateHashGenerator;  // port — see below
  idGen: IdGenerator;
  clock: Clock;
}
```

**Flow:**
1. Find course → `course_not_found`
2. Find active enrollment for (user, course) → `enrollment_not_found`
3. Check `enrollment.progressPercent === 100` → `course_not_completed`
4. Check if a certificate already exists for (user, course) → `already_issued`
5. Generate a ULID for the cert id
6. Generate the verification hash via the port
7. Build the certificate via `createCertificate`
8. Persist via `certificateRepo.create`
9. Return `{ certificate, isReissue: false }`

Re-issue is intentionally NOT this story's concern. STORY-044 covers
revocation + re-issue flow.

### Hash generation port

```typescript
// src/ports/security/CertificateHashGenerator.ts

export interface CertificateHashGenerator {
  /**
   * Produce a 64-char hex sha256 of the inputs.
   * Pure function — same inputs always produce the same hash.
   */
  hash(parts: { id: string; userId: string; courseId: string; issuedAt: Date }): string;
}
```

Adapter: `src/infra/security/NodeCertificateHashGenerator.ts` (uses
`node:crypto.createHash("sha256")`).
Fake: `src/infra/security/FakeCertificateHashGenerator.ts` (deterministic
counter-based hash, for tests).

## 5. Container Wiring

```typescript
// In AppContainer:
certificateRepo: ICertificateRepository;
hashGen: CertificateHashGenerator;
issueCertificate: IssueCertificate;
```

Wired in both `buildProductionContainer()` and `buildTestContainer()`.

## 6. Tests

- `Certificate` entity: create valid cert, invalid hash, revoke transition
  (active → revoked is valid, revoked → revoked is invalid)
- `IssueCertificate` use case: happy path, course not found, enrollment
  not found, course not completed (progress < 100), already issued
- `PrismaCertificateRepository` not unit-tested (covered by integration
  tests in a later story)
- Container: `issueCertificate` is wired and constructable

## 7. Files

| File | Change |
|---|---|
| `src/domain/entities/Certificate.ts` | New — Certificate entity |
| `src/ports/repositories/ICertificateRepository.ts` | New |
| `src/ports/security/CertificateHashGenerator.ts` | New — hash port |
| `src/infra/repositories/InMemoryCertificateRepository.ts` | New |
| `src/infra/repositories/PrismaCertificateRepository.ts` | New |
| `src/infra/security/NodeCertificateHashGenerator.ts` | New — sha256 adapter |
| `src/infra/security/FakeCertificateHashGenerator.ts` | New — deterministic fake |
| `src/usecases/IssueCertificate.ts` | New |
| `src/composition/container.ts` | Wire cert repo + use case |
| `prisma/schema.prisma` | Add Certificate model + back-relations on User/Course |
| `prisma/migrations/` | New migration |
| `tests/unit/domain/entities/Certificate.test.ts` | New |
| `tests/unit/usecases/IssueCertificate.test.ts` | New |
| `tests/unit/composition/container.test.ts` | Add issueCertificate wiring test |
| `docs/stories/STORY-041.md` | This doc |

## 8. Design Decisions

- **`verificationHash` is sha256 of `(id, userId, courseId, issuedAt)`** —
  deterministic, so re-derivation works for the public view (STORY-043).
  It's not a secret — anyone with the cert URL can see it — so this is fine.
  We just need a stable fingerprint.
- **Hash generation is behind a port** — keeps `node:crypto` out of the
  domain/use-case layer and lets tests use a deterministic fake.
- **`@@unique([userId, courseId])` enforces one cert per (user, course)** —
  domain logic also guards via `already_issued`, so the use case is
  idempotent.
- **Status stored as a string** (matches existing `Enrollment.status` pattern
  in the schema) — typed in the domain via `CertificateStatus` union.
- **No `User`/`Course` hydration in the repo** — the entity just carries
  `userId` and `courseId`. STORY-043's public view hydrates them via
  the existing `UserRepository` / `CourseRepository`.
- **Issuance is triggered manually in this story** — no automatic issuance
  on lesson completion. STORY-044 (refund/revocation) probably wants to
  also add the auto-issue trigger, but that's its concern.

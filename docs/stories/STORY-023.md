# STORY-023 — `EnrollStudent` Use Case

## Status

- **Story**: STORY-023
- **Sprint**: 5 — Enrollment + Access Policy
- **Points**: 1
- **Status**: Pending
- **Predecessor**: STORY-022 (AccessPolicy — EnrollStudent depends on `enrolledCourseIds` in User)

## Overview

`EnrollStudent` is the use case called by the PayMongo webhook handler when a payment succeeds. It grants a student full access to a course by:

1. Creating an `Enrollment` record in the DB
2. Updating `User.enrolledCourseIds` to include the course

## Domain Model

### `Enrollment` Entity

```typescript
export interface Enrollment {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly status: EnrollmentStatus;  // "active" | "cancelled" | "refunded" | "expired"
  readonly source: EnrollmentSource;  // "direct" | "affiliate" | "simulator_trial"
  readonly couponCode: string | null;
  readonly couponDiscount: number | null;
  readonly createdAt: Date;
}

export type EnrollmentStatus = "active" | "cancelled" | "refunded" | "expired";
export type EnrollmentSource = "direct" | "affiliate" | "simulator_trial";
```

### `Enrollment` Factory

```typescript
export function createEnrollment(params: {
  id: string;
  userId: string;
  courseId: string;
  source?: EnrollmentSource;
  couponCode?: string | null;
  couponDiscount?: number | null;
  createdAt?: Date;
}): Result<Enrollment, CreateEnrollmentError>;
```

## Architecture

```
domain/entities/Enrollment.ts      # Enrollment entity + factory
domain/values/EnrollmentStatus.ts  # "active" | "cancelled" | "refunded" | "expired"

ports/repositories/IEnrollmentRepository.ts  # create(), findById(), findByUserId()

usecases/EnrollStudent.ts          # EnrollStudent use case

infra/repositories/
  PrismaEnrollmentRepository.ts     # production impl
  InMemoryEnrollmentRepository.ts   # test impl
```

## Business Rules

1. User must exist → `user_not_found`
2. Course must exist → `course_not_found`
3. Course must be PUBLISHED → `course_not_published`
4. User must not already be enrolled → `already_enrolled`
5. On success: create `Enrollment` + append to `User.enrolledCourseIds` atomically

## `EnrollStudent` Use Case

```typescript
interface EnrollStudentInput {
  userId: string;
  courseId: string;
  source?: "direct" | "affiliate" | "simulator_trial";
  couponCode?: string | null;
  couponDiscount?: number | null;
}

interface EnrollStudentDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
}
```

## Tests

### `Enrollment` entity

- `createEnrollment` with valid params → ok with status `"active"`
- `createEnrollment` with empty userId → error
- `createEnrollment` with empty courseId → error

### `EnrollStudent` use case

- **happy path**: enrolls user, creates Enrollment, updates User.enrolledCourseIds
- **user not found**: returns `user_not_found`
- **course not found**: returns `course_not_found`
- **course not published**: returns `course_not_published`
- **already enrolled**: returns `already_enrolled`
- **enrolls with coupon**: Enrollment carries couponCode and couponDiscount

## Repository Extension

Add `enrolledCourseIds` to `UserRepository.update` patch type so the use case can append course IDs.

## Non-Goals

- No Prisma schema changes (schema already has `Enrollment` model + `enrolledCourseIds` on User)
- No webhook endpoint (STORY-019)
- No email notification in this story

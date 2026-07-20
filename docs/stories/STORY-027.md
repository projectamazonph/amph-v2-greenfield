# STORY-027 — `MarkLessonComplete` Use Case + `ProgressService` + `ProgressEvent` Log

## Status

- **Story**: STORY-027
- **Sprint**: 6 — Lesson Delivery + Progress
- **Points**: 1
**Status:** ✅ Done (PR #27, commit `5a7a9e2` — `feat(story-027): MarkLessonComplete use case + ProgressEvent log`)

## Overview

Students mark a lesson as complete. Progress is tracked on the `Enrollment` record. Each completion also logs a `ProgressEvent` for analytics.

## Domain Changes

### `Enrollment` — Add Progress Fields

```typescript
export interface Enrollment {
  // ... existing fields ...

  // Progress (mutable)
  completedLessonIds: string[];   // IDs of completed lessons
  lastLessonId: string | null;    // Most recently viewed/completed lesson
  progressPercent: number;         // 0–100
}

// New method on Enrollment
markLessonComplete(lessonId: string, courseLessonCount: number): void;
```

`markLessonComplete`:
- Appends `lessonId` to `completedLessonIds` (if not already present — idempotent)
- Sets `lastLessonId = lessonId`
- Sets `progressPercent = Math.round((completedLessonIds.length / courseLessonCount) * 100)`

## `ProgressEvent` — Audit Log

```typescript
export type ProgressEventType = "lesson_completed" | "course_started" | "course_completed";

export interface ProgressEvent {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly lessonId: string | null;
  readonly type: ProgressEventType;
  readonly metadata: Record<string, unknown>;  // e.g. { progressPercent: 50 }
  readonly createdAt: Date;
}
```

## `IProgressEventRepository` — Port

```typescript
export interface IProgressEventRepository {
  create(event: ProgressEvent): Promise<Result<ProgressEvent, ProgressEventError>>;
  findByUserId(userId: string): Promise<Result<readonly ProgressEvent[], ProgressEventError>>;
  findByCourseId(courseId: string): Promise<Result<readonly ProgressEvent[], ProgressEventError>>;
}
```

## `MarkLessonComplete` — Use Case

```typescript
interface MarkLessonCompleteInput {
  userId: string;
  courseId: string;
  lessonId: string;
}

interface MarkLessonCompleteDeps {
  enrollmentRepo: IEnrollmentRepository;
  progressEventRepo: IProgressEventRepository;
  courseRepo: CourseRepository;
  idGen: IdGenerator;
  clock: Clock;
}

type MarkLessonCompleteError =
  | { kind: "enrollment_not_found" }
  | { kind: "course_not_found" }
  | { kind: "lesson_not_in_course" }
  | { kind: "enrollment_not_active" };

type MarkLessonCompleteResult = Result<{
  enrollment: Enrollment;
  progressEvent: ProgressEvent;
  progressPercent: number;
}, MarkLessonCompleteError>;
```

Rules:
1. Enrollment must exist for user + course → `enrollment_not_found`
2. Enrollment must be `active` → `enrollment_not_active`
3. Course must exist → `course_not_found`
4. Lesson must be in the course's curriculum → `lesson_not_in_course`
5. Call `enrollment.markLessonComplete(lessonId, totalLessons)`
6. Persist updated enrollment
7. Create `ProgressEvent` of type `lesson_completed`
8. Return updated enrollment + event + progressPercent

## `ProgressService` — Query Service

```typescript
/**
 * Compute progress percentage from an enrollment.
 */
function computeProgressPercent(
  completedLessonIds: readonly string[],
  totalLessons: number,
): number;

/**
 * Is the course fully completed?
 */
function isCourseCompleted(
  completedLessonIds: readonly string[],
  totalLessons: number,
): boolean;

/**
 * Log a course_completed ProgressEvent when all lessons are done.
 * Called after markLessonComplete when progressPercent hits 100.
 */
```

## Tests

### `Enrollment.markLessonComplete`

- appends lessonId to completedLessonIds (new lesson)
- does NOT duplicate if lesson already completed (idempotent)
- sets lastLessonId
- computes progressPercent correctly: 1/4 = 25, 2/4 = 50, 4/4 = 100
- already-completed lesson → no-op (idempotent)

### `MarkLessonComplete` use case

- valid request → returns enrollment + event + correct percent
- enrollment not found → `enrollment_not_found`
- enrollment not active → `enrollment_not_active`
- lesson not in course → `lesson_not_in_course`
- idempotent: marking same lesson twice → no duplicate in completedLessonIds
- emits ProgressEvent with type `lesson_completed`
- when last lesson → emits `course_completed` ProgressEvent

### `ProgressService`

- computeProgressPercent: 0/10 = 0
- computeProgressPercent: 3/10 = 30
- computeProgressPercent: 10/10 = 100
- isCourseCompleted: false when 9/10
- isCourseCompleted: true when 10/10

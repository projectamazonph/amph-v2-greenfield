/**
 * EnrollStudent — grant a student full access to a course.
 *
 * STORY-023: EnrollStudent use case.
 *
 * Called by the PayMongo webhook handler when a payment succeeds.
 *
 * Steps:
 *  1. Validate user exists
 *  2. Validate course exists and is PUBLISHED
 *  3. Check user is not already enrolled (pre-check on User.enrolledCourseIds)
 *  4. Check no Enrollment record exists (DB uniqueness)
 *  5. Create Enrollment record
 *  6. Append courseId to User.enrolledCourseIds
 *  7. Return the Enrollment
 *
 * Fail Fast: returns typed errors early before touching persistence.
 */

import { Result } from "@/domain/shared/Result";
import { createEnrollment } from "@/domain/entities/Enrollment";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { Enrollment } from "@/domain/entities/Enrollment";


export interface EnrollStudentInput {
  userId: string;
  courseId: string;
  source?: "direct" | "affiliate" | "simulator_trial";
  couponCode?: string | null;
  couponDiscount?: number | null;
}

export type EnrollStudentError =
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "already_enrolled" };

export type EnrollStudentResult = Result<
  Enrollment,
  EnrollStudentError
>;

/** Minimal ID generator interface — EnrollStudent only needs newId(). */
export type IdGen = { newId(): string };

export interface EnrollStudentDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
  idGen: IdGen;
}

export class EnrollStudent {
  constructor(private readonly deps: EnrollStudentDeps) {}

  async execute(input: EnrollStudentInput): Promise<EnrollStudentResult> {
    const { userRepo, courseRepo, enrollmentRepo, idGen } = this.deps;

    // ── 1. User must exist ───────────────────────────────────
    const userResult = await userRepo.findById(input.userId);
    if (Result.isErr(userResult)) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    // ── Pre-check: already enrolled via User.enrolledCourseIds ─
    if (user.enrolledCourseIds.includes(input.courseId)) {
      return Result.err({ kind: "already_enrolled" });
    }

    // ── 2. Course must exist and be PUBLISHED ───────────────
    const courseResult = await courseRepo.findById(input.courseId);
    if (Result.isErr(courseResult)) {
      return Result.err({ kind: "course_not_found" });
    }
    const course = courseResult.value;
    if (course.status !== "PUBLISHED") {
      return Result.err({ kind: "course_not_published" });
    }

    // ── 3. DB-level uniqueness check ─────────────────────────
    const existing = await enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );
    if (existing !== null) {
      return Result.err({ kind: "already_enrolled" });
    }

    // ── 4. Create Enrollment ─────────────────────────────────
    const enrollmentResult = createEnrollment({
      id: idGen.newId(),
      userId: input.userId,
      courseId: input.courseId,
      source: input.source ?? "direct",
      couponCode: input.couponCode,
      couponDiscount: input.couponDiscount,
    });
    if (Result.isErr(enrollmentResult)) {
      // Should never happen given inputs, but handle defensively
      return Result.err({ kind: "user_not_found" }); // closest error
    }
    const enrollment = enrollmentResult.value;

    // ── 5. Persist enrollment ────────────────────────────────
    const persistedResult = await enrollmentRepo.create(enrollment);
    if (Result.isErr(persistedResult)) {
      // already_enrolled race condition — return the typed error
      if (persistedResult.error.kind === "already_enrolled") {
        return Result.err({ kind: "already_enrolled" });
      }
      return Result.err({ kind: "user_not_found" }); // closest error
    }

    // ── 6. Update User.enrolledCourseIds ────────────────────
    const updatedUserResult = await userRepo.update(input.userId, {
      enrolledCourseIds: [...user.enrolledCourseIds, input.courseId],
    });
    if (Result.isErr(updatedUserResult)) {
      // Non-fatal: enrollment is persisted; access policy will still grant access
      // Log here in production. For now, continue.
    }

    // ── 7. Return enrollment ─────────────────────────────────
    return Result.ok(enrollment);
  }
}

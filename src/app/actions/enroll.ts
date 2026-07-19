/**
 * enroll action — Story 017.
 * P0-1 fix: paywall enforcement.
 *
 * Server action that enrolls a student in a course.
 *
 * CRITICAL: The server decides the entitlement, not the client.
 * - Free courses (course.price.minor === 0) → entitlement: "free"
 * - Paid courses → refuse manual enrollment, redirect to /checkout
 *
 * Paid enrollments happen exclusively through the PayMongo webhook
 * after a successful payment (entitlement: "order"), or through
 * the admin-grant action (entitlement: "admin_grant"). Neither path
 * is reachable from this public action.
 *
 * SOLID notes:
 * - The action goes through buildContainer() (the composition root).
 * - Reads the session via getSessionUserId (src/lib/auth.ts).
 */

"use server";

import type { EnrollStudentResult } from "@/usecases/EnrollStudent";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

export type EnrollStudentActionResult = EnrollStudentResult | {
  ok: false;
  error: { kind: "unauthorized" };
} | {
  ok: false;
  error: { kind: "paid_checkout_required" };
};

export async function enrollStudent(
  courseId: string,
): Promise<EnrollStudentActionResult> {
  // 1. Authenticate via the sanctioned session helper.
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  const container = buildContainer();

  // 2. Look up the course so the server can decide the entitlement.
  const courseResult = await container.courseRepo.findById(courseId);
  if (Result.isErr(courseResult)) {
    return { ok: false, error: { kind: "course_not_found" } };
  }
  const course = courseResult.value;

  // 3. P0-1: refuse manual enroll for paid courses. Paid enrollments
  //    go through the checkout flow (PayMongo webhook → entitlement: "order").
  if (course.price.minor > 0) {
    return { ok: false, error: { kind: "paid_checkout_required" } };
  }

  // 4. Free course — proceed with "free" entitlement.
  const result = await container.enrollStudent.execute({
    userId,
    courseId,
    entitlement: "free",
  });

  if (Result.isOk(result)) {
    return { ok: true, value: result.value };
  }
  return { ok: false, error: result.error };
}

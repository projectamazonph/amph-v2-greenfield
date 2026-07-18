/**
 * enroll action — Story 017.
 *
 * Server action that enrolls a student in a course.
 *
 * Thin shell: read the session userId, delegate to the EnrollStudent
 * use case via the container, return the result.
 *
 * SOLID notes:
 * - The action goes through buildContainer() (the composition root),
 *   so the same wiring applies in prod and test. It MUST NOT
 *   instantiate InMemory* adapters directly — that would be the
 *   "in-memory in production" anti-pattern.
 * - Reads the session via getSessionUserId (src/lib/auth.ts), the
 *   single source of truth for session reading.
 * - The "enroll on payment" path is a separate story; this action
 *   is the manual-enroll path.
 */

"use server";

import type { EnrollStudentResult } from "@/usecases/EnrollStudent";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

export type EnrollStudentActionResult = EnrollStudentResult | {
  ok: false;
  error: { kind: "unauthorized" };
};

export async function enrollStudent(
  courseId: string,
): Promise<EnrollStudentActionResult> {
  // 1. Authenticate via the sanctioned session helper.
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // 2. Delegate to the use case via the container.
  const container = buildContainer();
  const result = await container.enrollStudent.execute({ userId, courseId });

  // 3. The use case's result is already a Result<Enrollment, ...>;
  //    pass it through. (We use Result.isOk as a TS narrowing aid
  //    to keep the discriminated-union type visible.)
  if (Result.isOk(result)) {
    return { ok: true, value: result.value };
  }
  return { ok: false, error: result.error };
}

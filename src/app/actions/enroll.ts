/**
 * enroll action — Story 017.
 *
 * Server action that enrolls a student in a course.
 */

"use server";

import type { EnrollStudentResult } from "@/usecases/EnrollStudent";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";

export async function enrollStudent(courseId: string): Promise<EnrollStudentResult> {
  // TODO: STORY-020 — get authenticated userId from session
  // For now: require X-Enrol-User-Id header (replace with session in STORY-020)
  const userId = `demo-user-${Date.now()}`;

  const courseRepo = new InMemoryCourseRepository();
  const userRepo = new InMemoryUserRepository();
  const enrollmentRepo = new InMemoryEnrollmentRepository();

  const useCase = new EnrollStudent({
    courseRepo,
    userRepo,
    enrollmentRepo,
    idGen: { newId: () => `enrol_${Date.now()}` },
  });

  return useCase.execute({ userId, courseId });
}

/**
 * enroll action — Story 017.
 *
 * Server action that enrolls a student in a course.
 * In STORY-021 this will redirect to PayMongo for paid courses.
 */

"use server";

import type { EnrollStudentOutput } from "@/usecases/EnrollStudent";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";

export async function enrollStudent(courseId: string): Promise<EnrollStudentOutput> {
  // TODO: STORY-020 — get authenticated userId from session
  // For now: require X-Enrol-User-Id header (replace with session in STORY-020)
  const userId = `demo-user-${Date.now()}`;

  const courseRepo = new InMemoryCourseRepository();
  const useCase = new EnrollStudent(courseRepo, () => `enrol_${Date.now()}`);
  return useCase.execute(userId, courseId);
}

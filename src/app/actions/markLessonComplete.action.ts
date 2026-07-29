/**
 * markLessonComplete action — STORY-027.
 *
 * The MarkLessonComplete use case has existed since STORY-027 but was
 * never reachable: no container entry, no action, no UI. Enrollment
 * progress therefore sat at 0% forever, which also meant no lesson XP,
 * no course-completion XP, and no certificate eligibility.
 *
 * The action is thin by design (ADR-013): authenticate, delegate,
 * revalidate. Every rule (active enrollment, lesson-in-course,
 * idempotency, XP, progress events) lives in the use case.
 */

"use server";

import { revalidatePath } from "next/cache";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import type { MarkLessonCompleteError } from "@/usecases/MarkLessonComplete";

export type MarkLessonCompleteActionResult =
  | {
      ok: true;
      value: {
        progressPercent: number;
        completedLessonIds: readonly string[];
        courseCompleted: boolean;
      };
    }
  | { ok: false; error: { kind: "unauthorized" } }
  | { ok: false; error: MarkLessonCompleteError };

export async function markLessonComplete(input: {
  courseId: string;
  courseSlug: string;
  lessonId: string;
}): Promise<MarkLessonCompleteActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  const container = buildContainer();
  const result = await container.markLessonComplete.execute({
    userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
  });

  if (Result.isErr(result)) {
    return { ok: false, error: result.error };
  }

  const { enrollment, progressPercent } = result.value;

  // The sidebar checkmarks, the course page and the dashboard progress
  // bars all read the enrollment, so they are stale until revalidated.
  revalidatePath(`/courses/${input.courseSlug}/lessons/${input.lessonId}`);
  revalidatePath(`/courses/${input.courseSlug}`);
  revalidatePath("/dashboard");

  return {
    ok: true,
    value: {
      progressPercent,
      completedLessonIds: enrollment.completedLessonIds,
      courseCompleted: progressPercent >= 100,
    },
  };
}

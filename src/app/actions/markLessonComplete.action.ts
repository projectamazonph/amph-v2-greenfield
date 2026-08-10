"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

const inputSchema = z.object({
  courseId: z.string().min(1).max(128),
  courseSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  lessonId: z.string().min(1).max(128),
});

export type MarkLessonCompleteActionInput = z.infer<typeof inputSchema>;

export async function markLessonCompleteAction(
  rawInput: MarkLessonCompleteActionInput,
): Promise<never> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) redirect("/courses?error=invalid_lesson");

  const input = parsed.data;
  const lessonPath = `/courses/${input.courseSlug}/lessons/${input.lessonId}`;
  const userId = await getSessionUserId();
  if (!userId) redirect(`/login?redirect=${encodeURIComponent(lessonPath)}`);

  const result = await buildContainer().markLessonComplete.execute({
    userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
  });

  if (!result.ok) {
    redirect(`${lessonPath}?completeError=${result.error.kind}`);
  }

  revalidatePath(`/courses/${input.courseSlug}`);
  revalidatePath(lessonPath);
  revalidatePath("/dashboard");
  redirect(`${lessonPath}?completed=1`);
}

"use server";

/**
 * Server action for the student "mark recording as watched" flow.
 *
 * STORY-100. Thin shim around `MarkLiveClassRecordingWatched`, mirroring
 * `liveClassRsvp.action.ts`'s shape.
 */

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export type MarkLiveClassRecordingWatchedResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "class_not_found"
        | "recording_not_available"
        | "not_registered"
        | "course_access_required"
        | "db_error";
    };

export async function markLiveClassRecordingWatchedAction(
  liveClassId: string,
): Promise<MarkLiveClassRecordingWatchedResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }
  const container = buildContainer();
  const r = await container.markLiveClassRecordingWatched.execute({
    userId,
    liveClassId,
  });
  if (r.ok) {
    revalidatePath(`/live-classes/${liveClassId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  }
  const e = r.error;
  const mapped: MarkLiveClassRecordingWatchedResult =
    e.kind === "not_found"
      ? { ok: false, error: "class_not_found" }
      : e.kind === "recording_not_available"
        ? { ok: false, error: "recording_not_available" }
        : e.kind === "course_access_required"
          ? { ok: false, error: "course_access_required" }
          : e.kind === "not_registered"
            ? { ok: false, error: "not_registered" }
            : { ok: false, error: "db_error" };
  return mapped;
}

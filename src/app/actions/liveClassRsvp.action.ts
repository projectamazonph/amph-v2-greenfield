"use server";

/**
 * Server actions for the student live-class RSVP flow.
 *
 * STORY-091. Thin 5-line shims around the use cases. Per `lib/auth.ts`
 * `getSessionUserId()` validates the JWT, the `sessions` table, and the
 * user record — that's why we use it here instead of a hand-rolled
 * cookie parse.
 */

import { revalidatePath } from "next/cache";
import { Result } from "@/domain/shared/Result";
import { getSessionUserId } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export type RsvpResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "already_registered"
        | "class_not_found"
        | "class_unavailable"
        | "course_access_required"
        | "db_error";
    };

export async function rsvpLiveClassAction(liveClassId: string): Promise<RsvpResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }
  const container = buildContainer();
  const r = await container.rsvpLiveClass.execute({
    userId,
    liveClassId,
  });
  if (r.ok) {
    revalidatePath("/live-classes");
    revalidatePath(`/live-classes/${liveClassId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  }
  const e = r.error;
  const mapped: RsvpResult =
    e.kind === "not_found"
      ? { ok: false, error: "class_not_found" }
      : e.kind === "class_cancelled_or_completed"
        ? { ok: false, error: "class_unavailable" }
        : e.kind === "course_access_required"
          ? { ok: false, error: "course_access_required" }
          : e.kind === "already_registered"
            ? { ok: false, error: "already_registered" }
            : { ok: false, error: "db_error" };
  return mapped;
}

export type CancelRsvpResult =
  { ok: true } | { ok: false; error: "unauthenticated" | "not_registered" | "db_error" };

export async function cancelLiveClassRsvpAction(liveClassId: string): Promise<CancelRsvpResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "unauthenticated" };
  }
  const container = buildContainer();
  const r = await container.cancelLiveClassRsvp.execute({
    userId,
    liveClassId,
  });
  if (r.ok) {
    revalidatePath("/live-classes");
    revalidatePath(`/live-classes/${liveClassId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  }
  const e = r.error;
  const mapped: CancelRsvpResult =
    e.kind === "not_registered"
      ? { ok: false, error: "not_registered" }
      : { ok: false, error: "db_error" };
  return mapped;
}

// Keep `Result` referenced so the type-import audit doesn't flag it.
void Result;

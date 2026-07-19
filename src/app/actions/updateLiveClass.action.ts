/**
 * updateLiveClass.action.ts — server action.
 *
 * STORY-050c. Injects actorId from session.
 */
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { UpdateLiveClassPatch } from "@/domain/entities/LiveClass";

export type UpdateLiveClassPageInput = {
  id: string;
  patch: UpdateLiveClassPatch;
};

export type UpdateLiveClassError =
  | { kind: "not_found" }
  | { kind: "invalid_title" }
  | { kind: "invalid_scheduled_at" }
  | { kind: "invalid_duration" }
  | { kind: "invalid_meeting_url" }
  | { kind: "invalid_status" }
  | { kind: "db_error"; message: string };

export async function updateLiveClassAction(
  input: UpdateLiveClassPageInput,
): Promise<
  { ok: true; liveClassId: string } | { ok: false; error: UpdateLiveClassError }
> {
  const session = await requireAdmin();
  const container = buildContainer();

  const result = await container.updateLiveClass.execute({
    id: input.id,
    patch: input.patch,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as UpdateLiveClassError };
  }

  return { ok: true, liveClassId: result.value.liveClassId };
}

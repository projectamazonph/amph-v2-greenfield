/**
 * createLiveClass.action — server action.
 *
 * STORY-050c. Injects actorId from session.
 */
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { CreateLiveClassInput_ } from "@/usecases/CreateLiveClass";

export type CreateLiveClassPageInput = Omit<
  CreateLiveClassInput_,
  "id" | "actorId"
>;

export type CreateLiveClassError =
  | { kind: "invalid_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_scheduled_at" }
  | { kind: "invalid_duration" }
  | { kind: "invalid_meeting_url" }
  | { kind: "invalid_status" }
  | { kind: "id_conflict" }
  | { kind: "db_error"; message: string };

export async function createLiveClassAction(
  input: CreateLiveClassPageInput,
): Promise<
  { ok: true; liveClassId: string } | { ok: false; error: CreateLiveClassError }
> {
  const session = await requireAdmin();
  const container = buildContainer();

  const idResult = container.idGen.newId();
  const result = await container.createLiveClass.execute({
    ...input,
    id: idResult,
    actorId: session.id,
  });

  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return { ok: false, error: { kind: "db_error", message: "Failed to create live class" } };
    }
    return { ok: false, error: result.error as CreateLiveClassError };
  }

  return { ok: true, liveClassId: result.value.liveClassId };
}

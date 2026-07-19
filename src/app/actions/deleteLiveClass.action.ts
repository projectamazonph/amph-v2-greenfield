/**
 * deleteLiveClass.action.ts — server action.
 *
 * STORY-050c. Injects actorId from session.
 */
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface DeleteLiveClassInput {
  id: string;
}

export type DeleteLiveClassError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export async function deleteLiveClassAction(
  input: DeleteLiveClassInput,
): Promise<
  { ok: true; liveClassId: string } | { ok: false; error: DeleteLiveClassError }
> {
  const session = await requireAdmin();
  const container = buildContainer();

  const result = await container.deleteLiveClass.execute({
    id: input.id,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as DeleteLiveClassError };
  }

  return { ok: true, liveClassId: result.value.liveClassId };
}

/**
 * deleteResource.action.ts — server action.
 *
 * STORY-098. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface DeleteResourceInput {
  id: string;
}

export type DeleteResourceError = { kind: "not_found" } | { kind: "db_error"; message: string };

export async function deleteResourceAction(
  input: DeleteResourceInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: DeleteResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const result = await container.deleteResource.execute({
    id: input.id,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as DeleteResourceError };
  }

  return { ok: true, resourceId: result.value.resourceId };
}

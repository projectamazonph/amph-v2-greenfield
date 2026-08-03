/**
 * purgeResource.action.ts — server action.
 *
 * STORY-098.5. Injects actorId from session. Distinct from
 * deleteResource.action.ts (unpublish): this permanently removes the
 * resource row and, if it owned an uploaded file, deletes it from
 * storage too. Irreversible — the admin UI gates this behind its own
 * confirmation, separate from the "Unpublish" action.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface PurgeResourceInput {
  id: string;
}

export type PurgeResourceError = { kind: "not_found" } | { kind: "db_error"; message: string };

export async function purgeResourceAction(
  input: PurgeResourceInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: PurgeResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const result = await container.purgeResource.execute({
    id: input.id,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as PurgeResourceError };
  }

  return { ok: true, resourceId: result.value.resourceId };
}

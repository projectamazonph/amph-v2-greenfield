/**
 * updateResource.action.ts — server action.
 *
 * STORY-098. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { UpdateResourcePatch } from "@/domain/entities/Resource";

export interface UpdateResourcePageInput {
  id: string;
  patch: UpdateResourcePatch;
}

export type UpdateResourceError =
  | { kind: "not_found" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_category" }
  | { kind: "invalid_file_type" }
  | { kind: "invalid_file_url" }
  | { kind: "invalid_access_tier" }
  | { kind: "db_error"; message: string };

export async function updateResourceAction(
  input: UpdateResourcePageInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: UpdateResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const result = await container.updateResource.execute({
    id: input.id,
    patch: input.patch,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as UpdateResourceError };
  }

  return { ok: true, resourceId: result.value.resourceId };
}

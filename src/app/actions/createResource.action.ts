/**
 * createResource.action.ts — server action.
 *
 * STORY-098. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { CreateResourceInput_ } from "@/usecases/CreateResource";

export type CreateResourcePageInput = Omit<CreateResourceInput_, "id" | "actorId">;

export type CreateResourceError =
  | { kind: "invalid_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_category" }
  | { kind: "invalid_file_type" }
  | { kind: "invalid_file_url" }
  | { kind: "invalid_access_tier" }
  | { kind: "db_error"; message: string };

export async function createResourceAction(
  input: CreateResourcePageInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: CreateResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const id = container.idGen.newId();
  const result = await container.createResource.execute({
    ...input,
    id,
    actorId: session.id,
  });

  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return { ok: false, error: { kind: "db_error", message: "Failed to create resource" } };
    }
    return { ok: false, error: result.error as CreateResourceError };
  }

  return { ok: true, resourceId: result.value.resourceId };
}

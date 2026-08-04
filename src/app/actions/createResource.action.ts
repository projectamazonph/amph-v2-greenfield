/**
 * createResource.action.ts — server action.
 *
 * STORY-098. Injects actorId from session. STORY-098.5: accepts an
 * optional uploaded `file` alongside (or instead of) a pasted
 * `fileUrl` — when both are present, the upload wins.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { CreateResourceInput_ } from "@/usecases/CreateResource";
import { uploadResourceFile } from "@/app/actions/resourceFileUpload.helper";

export type CreateResourcePageInput = Omit<
  CreateResourceInput_,
  "id" | "actorId" | "fileUrl" | "fileKey"
> & {
  fileUrl?: string;
  file?: File | null;
};

export type CreateResourceError =
  | { kind: "invalid_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_category" }
  | { kind: "invalid_file_type" }
  | { kind: "invalid_file_url" }
  | { kind: "invalid_access_tier" }
  | { kind: "file_too_large" }
  | { kind: "unsupported_file_type" }
  | { kind: "db_error"; message: string };

export async function createResourceAction(
  input: CreateResourcePageInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: CreateResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const id = container.idGen.newId();

  let fileUrl = input.fileUrl?.trim() ?? "";
  let fileKey: string | null = null;

  if (input.file && input.file.size > 0) {
    const uploadResult = await uploadResourceFile(container, id, input.file);
    if (!uploadResult.ok) {
      return { ok: false, error: uploadResult.error };
    }
    fileUrl = uploadResult.fileUrl;
    fileKey = uploadResult.fileKey;
  }

  if (!fileUrl) {
    return { ok: false, error: { kind: "invalid_file_url" } };
  }

  const result = await container.createResource.execute({
    title: input.title,
    description: input.description,
    category: input.category,
    fileType: input.fileType,
    accessTier: input.accessTier,
    fileUrl,
    fileKey,
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

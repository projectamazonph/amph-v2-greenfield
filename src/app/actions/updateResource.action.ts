/**
 * updateResource.action.ts — server action.
 *
 * STORY-098. Injects actorId from session. STORY-098.5: accepts an
 * optional `file` to replace the resource's current file — when
 * present, it's uploaded and the patch's fileUrl/fileKey are set from
 * the upload result before the resource is updated. Cleanup of the
 * previously-uploaded file (if any) happens inside `UpdateResource`.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { UpdateResourcePatch } from "@/domain/entities/Resource";
import { uploadResourceFile } from "@/app/actions/resourceFileUpload.helper";

export interface UpdateResourcePageInput {
  id: string;
  patch: UpdateResourcePatch;
  file?: File | null;
}

export type UpdateResourceError =
  | { kind: "not_found" }
  | { kind: "invalid_title" }
  | { kind: "invalid_description" }
  | { kind: "invalid_category" }
  | { kind: "invalid_file_type" }
  | { kind: "invalid_file_url" }
  | { kind: "invalid_access_tier" }
  | { kind: "file_too_large" }
  | { kind: "unsupported_file_type" }
  | { kind: "db_error"; message: string };

export async function updateResourceAction(
  input: UpdateResourcePageInput,
): Promise<{ ok: true; resourceId: string } | { ok: false; error: UpdateResourceError }> {
  const session = await requireAdmin();
  const container = buildContainer();

  let patch = input.patch;

  if (input.file && input.file.size > 0) {
    const uploadResult = await uploadResourceFile(container, input.id, input.file);
    if (!uploadResult.ok) {
      return { ok: false, error: uploadResult.error };
    }
    patch = { ...patch, fileUrl: uploadResult.fileUrl, fileKey: uploadResult.fileKey };
  } else if (patch.fileUrl !== undefined) {
    // A plain URL edit without a new upload switches this resource to an
    // external link (or a different static asset) we don't own — clear
    // fileKey so UpdateResource's cleanup deletes the now-orphaned upload
    // and future edits don't treat this resource as still owning it.
    patch = { ...patch, fileKey: null };
  }

  const result = await container.updateResource.execute({
    id: input.id,
    patch,
    actorId: session.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error as UpdateResourceError };
  }

  return { ok: true, resourceId: result.value.resourceId };
}

/**
 * Shared upload helper for createResource/updateResource actions.
 *
 * STORY-098.5. Not a server action itself (no directive, not exported
 * to a page) — just the multipart-to-storage-key plumbing both
 * actions need, kept out of each so the key-naming convention lives
 * in exactly one place.
 */
import type { AppContainer } from "@/composition/container";

export type ResourceFileUploadError =
  { kind: "invalid_file_url" } | { kind: "db_error"; message: string };

/** Storage key: resources/<resourceId>/<sanitized original filename>. */
function buildResourceFileKey(resourceId: string, originalName: string): string {
  let sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  // The regex above already strips every "/" and "\", so a path-traversal
  // sequence like "../../etc/passwd" can't survive as multiple segments —
  // but a bare "." or ".." is still a single valid (if useless) path
  // segment. Reject those specifically rather than relying on the fixed
  // "resources/<id>/" prefix alone to contain them.
  if (sanitized === "." || sanitized === "..") {
    sanitized = "upload";
  }
  return `resources/${resourceId}/${sanitized}`;
}

export async function uploadResourceFile(
  container: AppContainer,
  resourceId: string,
  file: File,
): Promise<
  { ok: true; fileUrl: string; fileKey: string } | { ok: false; error: ResourceFileUploadError }
> {
  const key = buildResourceFileKey(resourceId, file.name || "upload");
  const data = Buffer.from(await file.arrayBuffer());
  const result = await container.uploadFile.execute({
    key,
    data,
    contentType: file.type || "application/octet-stream",
  });

  if (!result.ok) {
    return { ok: false, error: { kind: "db_error", message: result.error.message } };
  }

  return { ok: true, fileUrl: result.value.url, fileKey: result.value.key };
}

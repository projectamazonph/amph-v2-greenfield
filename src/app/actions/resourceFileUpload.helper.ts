/**
 * Shared upload helper for createResource/updateResource actions.
 *
 * STORY-098.5. Not a server action itself (no directive, not exported
 * to a page) — just the multipart-to-storage-key plumbing both
 * actions need, kept out of each so the key-naming convention lives
 * in exactly one place.
 *
 * Size and MIME-type are validated before the file is buffered into
 * memory (a review finding: this used to read the entire file via
 * `file.arrayBuffer()` with no upper bound and no type check at all —
 * unbounded on an admin-only route, but still worth a floor). Both
 * `file.size` and `file.type` are available synchronously on the `File`
 * object, so both checks happen before the only `await` in this file.
 */
import type { AppContainer } from "@/composition/container";

/** 25 MB — generous for the guide/template/handout PDFs, spreadsheets, and
 * zips this route accepts, well short of "someone uploaded a video." */
export const MAX_RESOURCE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Not exhaustive of every resource fileType category (`gsheet`/`link`
 * are external URLs, never uploaded as bytes) — just an allowlist for
 * what an actual file upload can plausibly be. */
export const ALLOWED_RESOURCE_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export type ResourceFileUploadError =
  | { kind: "invalid_file_url" }
  | { kind: "file_too_large" }
  | { kind: "unsupported_file_type" }
  | { kind: "db_error"; message: string };

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
  if (file.size > MAX_RESOURCE_FILE_SIZE_BYTES) {
    return { ok: false, error: { kind: "file_too_large" } };
  }
  if (file.type && !ALLOWED_RESOURCE_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: { kind: "unsupported_file_type" } };
  }

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

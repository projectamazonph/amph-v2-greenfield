/**
 * `IFileStorage` — port for uploading and deleting admin-supplied files.
 *
 * STORY-098.5. Introduced for the download center's "upload a file"
 * flow (as opposed to pasting an external link), but concern-scoped
 * as a generic file storage port, not resource-specific, so any
 * future feature needing file upload can reuse it.
 *
 * `upload` and `delete` are keyed by an opaque storage `key` the
 * caller controls (see `buildResourceStorageKey` in
 * `src/domain/entities/Resource.ts`-adjacent usage) — callers own key
 * naming; this port only owns where the bytes live.
 */
import type { Result } from "@/domain/shared/Result";

export type FileStorageError =
  { kind: "upload_failed"; message: string } | { kind: "delete_failed"; message: string };

export interface UploadFileInput {
  /** Storage key (path-like, e.g. "resources/<id>/<filename>"). Caller-controlled. */
  key: string;
  data: Buffer;
  contentType: string;
}

export interface UploadedFile {
  /** Publicly fetchable URL for the uploaded file. */
  url: string;
  /** The key it was stored under — persist this to delete/replace later. */
  key: string;
}

export interface IFileStorage {
  upload(input: UploadFileInput): Promise<Result<UploadedFile, FileStorageError>>;

  /** Best-effort delete. Deleting a key that doesn't exist is not an error. */
  delete(key: string): Promise<Result<void, FileStorageError>>;
}

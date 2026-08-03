/**
 * VercelBlobFileStorage — production `IFileStorage` adapter.
 *
 * STORY-098.5. Backed by Vercel Blob (`@vercel/blob`). Requires
 * `BLOB_READ_WRITE_TOKEN` (provisioned by adding a Blob store to the
 * Vercel project); `buildContainer()` only wires this adapter when
 * that env var is set, falling back to `LocalFileStorage` otherwise
 * — see that file's docblock for why the fallback isn't viable in
 * production either. Uploads are public (`access: "public"`): the
 * download center's actual gating happens in
 * `RecordResourceDownload`/the download route, not by hiding the
 * blob URL, so a public blob is the right default — the same trust
 * boundary as an admin-pasted Google Drive link.
 */
import { put, del } from "@vercel/blob";
import type { Result } from "@/domain/shared/Result";
import type {
  IFileStorage,
  FileStorageError,
  UploadFileInput,
  UploadedFile,
} from "@/ports/storage/IFileStorage";

export class VercelBlobFileStorage implements IFileStorage {
  constructor(private readonly token: string) {}

  async upload(input: UploadFileInput): Promise<Result<UploadedFile, FileStorageError>> {
    try {
      const blob = await put(input.key, input.data, {
        access: "public",
        contentType: input.contentType,
        token: this.token,
        addRandomSuffix: false,
      });
      return { ok: true, value: { url: blob.url, key: input.key } };
    } catch (err: unknown) {
      return { ok: false, error: { kind: "upload_failed", message: String(err) } };
    }
  }

  async delete(key: string): Promise<Result<void, FileStorageError>> {
    try {
      await del(key, { token: this.token });
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      return { ok: false, error: { kind: "delete_failed", message: String(err) } };
    }
  }
}

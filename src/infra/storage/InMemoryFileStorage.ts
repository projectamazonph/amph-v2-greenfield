/**
 * In-memory `IFileStorage` adapter. Used by `buildTestContainer()`.
 *
 * STORY-098.5.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  IFileStorage,
  FileStorageError,
  UploadFileInput,
  UploadedFile,
} from "@/ports/storage/IFileStorage";

export class InMemoryFileStorage implements IFileStorage {
  private readonly _files = new Map<string, { data: Buffer; contentType: string }>();

  async upload(input: UploadFileInput): Promise<Result<UploadedFile, FileStorageError>> {
    this._files.set(input.key, { data: input.data, contentType: input.contentType });
    return { ok: true, value: { url: `https://fake-storage.test/${input.key}`, key: input.key } };
  }

  async delete(key: string): Promise<Result<void, FileStorageError>> {
    this._files.delete(key);
    return { ok: true, value: undefined };
  }

  // ── Test helpers ─────────────────────────────────────────────────────

  has(key: string): boolean {
    return this._files.has(key);
  }

  get(key: string): Buffer | null {
    return this._files.get(key)?.data ?? null;
  }

  clear(): void {
    this._files.clear();
  }
}

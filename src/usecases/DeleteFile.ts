/**
 * `DeleteFile` — generic file deletion use case.
 *
 * STORY-098.5. Companion to `UploadFile`. Deleting a key that no
 * longer exists is not an error (`IFileStorage.delete` is best-effort
 * by contract).
 */
import type { Result } from "@/domain/shared/Result";
import type { IFileStorage, FileStorageError } from "@/ports/storage/IFileStorage";

export class DeleteFile {
  constructor(private readonly deps: { fileStorage: IFileStorage }) {}

  async execute(key: string): Promise<Result<void, FileStorageError>> {
    return this.deps.fileStorage.delete(key);
  }
}

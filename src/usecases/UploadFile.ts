/**
 * `UploadFile` — generic file upload use case.
 *
 * STORY-098.5. Deliberately not resource-specific: it just validates
 * nothing beyond "there's data" and delegates to `IFileStorage`. The
 * caller (e.g. the resource create/update server actions) owns the
 * upload's meaning — key naming, which entity it belongs to, etc.
 */
import type { Result } from "@/domain/shared/Result";
import type { IFileStorage, FileStorageError, UploadedFile } from "@/ports/storage/IFileStorage";

export interface UploadFileInput {
  key: string;
  data: Buffer;
  contentType: string;
}

export class UploadFile {
  constructor(private readonly deps: { fileStorage: IFileStorage }) {}

  async execute(input: UploadFileInput): Promise<Result<UploadedFile, FileStorageError>> {
    return this.deps.fileStorage.upload(input);
  }
}

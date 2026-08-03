/**
 * LocalFileStorage — dev-only `IFileStorage` adapter.
 *
 * STORY-098.5. Writes uploaded files to `public/uploads/<key>` on
 * local disk and returns a root-relative URL (`/uploads/<key>`),
 * served directly by Next.js's static file handling — no app-URL
 * env var needed, works the same on localhost and any deployed
 * domain.
 *
 * **Not viable in production on Vercel.** Vercel's serverless
 * functions have a read-only filesystem outside `/tmp`, and even
 * `/tmp` doesn't persist across invocations or survive a redeploy.
 * This adapter exists so local development and tests that exercise
 * the real filesystem path work without any cloud credentials; the
 * production adapter is `VercelBlobFileStorage`. `buildContainer()`
 * uses this one only as a fallback when `BLOB_READ_WRITE_TOKEN` isn't
 * set — see that file's docblock.
 */
import { promises as fs } from "fs";
import path from "path";
import type { Result } from "@/domain/shared/Result";
import type {
  IFileStorage,
  FileStorageError,
  UploadFileInput,
  UploadedFile,
} from "@/ports/storage/IFileStorage";

export class LocalFileStorage implements IFileStorage {
  private readonly uploadsDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.uploadsDir = path.join(baseDir, "public", "uploads");
  }

  async upload(input: UploadFileInput): Promise<Result<UploadedFile, FileStorageError>> {
    try {
      const destPath = path.join(this.uploadsDir, input.key);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, input.data);
      return { ok: true, value: { url: `/uploads/${input.key}`, key: input.key } };
    } catch (err: unknown) {
      return { ok: false, error: { kind: "upload_failed", message: String(err) } };
    }
  }

  async delete(key: string): Promise<Result<void, FileStorageError>> {
    try {
      await fs.unlink(path.join(this.uploadsDir, key));
      return { ok: true, value: undefined };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return { ok: true, value: undefined };
      }
      return { ok: false, error: { kind: "delete_failed", message: String(err) } };
    }
  }
}

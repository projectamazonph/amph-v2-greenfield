/**
 * `RecordResourceDownload` — authorize + record a download-center
 * download.
 *
 * STORY-098 / STORY-098.5. `fileUrl` may be a static asset, an
 * admin-pasted external link, or an `IFileStorage` upload URL — this
 * use case doesn't care which. It's what stands between "student
 * clicks Download" and that URL: it re-checks the resource is
 * published and the viewer's subscription tier actually meets the
 * resource's `accessTier` (a student can't bypass the lock by hitting
 * the download route directly), then increments the download counter
 * and writes an audit entry before handing back the URL to redirect
 * to.
 */
import { Result } from "@/domain/shared/Result";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import { subscriptionMeetsCourseTier } from "@/domain/values/CourseAccessTier";
import type { SubscriptionTier } from "@/domain/entities/User";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface RecordResourceDownloadInput {
  resourceId: string;
  userId: string;
  subscriptionTier: SubscriptionTier;
}

export type RecordResourceDownloadError =
  | { kind: "not_found" }
  | { kind: "not_published" }
  | { kind: "access_denied" }
  | { kind: "db_error"; message: string };

export type RecordResourceDownloadResult = Result<
  { fileUrl: string },
  RecordResourceDownloadError | ResourceRepositoryError
>;

export class RecordResourceDownload {
  constructor(
    private readonly deps: {
      resourceRepo: IResourceRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: RecordResourceDownloadInput): Promise<RecordResourceDownloadResult> {
    const findResult = await this.deps.resourceRepo.findById(input.resourceId);
    if (!findResult.ok) return findResult;
    if (findResult.value === null) {
      return { ok: false, error: { kind: "not_found" } };
    }

    const resource = findResult.value;

    if (!resource.isPublished) {
      return { ok: false, error: { kind: "not_published" } };
    }

    if (!subscriptionMeetsCourseTier(input.subscriptionTier, resource.accessTier)) {
      return { ok: false, error: { kind: "access_denied" } };
    }

    const incrementResult = await this.deps.resourceRepo.incrementDownloadCount(resource.id);
    if (!incrementResult.ok) return incrementResult;

    await this.deps.recordAuditLog.execute({
      actorId: input.userId,
      action: "resource.downloaded",
      targetId: resource.id,
      targetType: "resource",
      metadata: { title: resource.title, category: resource.category },
    });

    return { ok: true, value: { fileUrl: resource.fileUrl } };
  }
}

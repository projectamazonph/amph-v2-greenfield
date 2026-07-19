/**
 * `AdminArchiveDiscountCode` — archive (soft-delete) a discount code.
 *
 * STORY-050d.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminArchiveDiscountCodeInput {
  id: string;
  actorId: string;
}

export type AdminArchiveDiscountCodeResult = Result<
  { discountCodeId: string },
  DiscountCodeRepositoryError
>;

export class AdminArchiveDiscountCode {
  constructor(
    private readonly deps: {
      discountCodeRepo: IDiscountCodeRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(
    input: AdminArchiveDiscountCodeInput,
  ): Promise<AdminArchiveDiscountCodeResult> {
    // Idempotent: if not found, return success
    const findResult = await this.deps.discountCodeRepo.findById(input.id);
    if (!findResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.archive_failed",
        targetId: input.id,
        targetType: "discount_code",
        metadata: { error: findResult.error.kind },
      });
      return findResult as unknown as AdminArchiveDiscountCodeResult;
    }

    const wasAlreadyArchived = findResult.value === null;

    if (!wasAlreadyArchived) {
      const archiveResult = await this.deps.discountCodeRepo.archive(input.id);
      if (!archiveResult.ok) {
        void this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "discount_code.archive_failed",
          targetId: input.id,
          targetType: "discount_code",
          metadata: { error: archiveResult.error.kind },
        });
        return archiveResult as unknown as AdminArchiveDiscountCodeResult;
      }

      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.archived",
        targetId: input.id,
        targetType: "discount_code",
        metadata: {},
      });
    }

    return { ok: true, value: { discountCodeId: input.id } };
  }
}

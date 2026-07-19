/**
 * `AdminUpdateDiscountCode` — admin updates an existing discount code.
 *
 * STORY-050d.
 */
import { Result } from "@/domain/shared/Result";
import {
  updateDiscountCode,
  type UpdateDiscountCodePatch,
} from "@/domain/entities/DiscountCode";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminUpdateDiscountCodeInput {
  id: string;
  patch: UpdateDiscountCodePatch;
  actorId: string;
}

export type AdminUpdateDiscountCodeResult = Result<
  { discountCodeId: string },
  | { kind: "not_found" }
  | { kind: "invalid_code"; message: string }
  | { kind: "invalid_value" }
  | { kind: "invalid_max_uses" }
  | DiscountCodeRepositoryError
>;

export class AdminUpdateDiscountCode {
  constructor(
    private readonly deps: {
      discountCodeRepo: IDiscountCodeRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: AdminUpdateDiscountCodeInput): Promise<AdminUpdateDiscountCodeResult> {
    const findResult = await this.deps.discountCodeRepo.findById(input.id);
    if (!findResult.ok) {
      return findResult as unknown as AdminUpdateDiscountCodeResult;
    }
    if (findResult.value === null) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.update_failed",
        targetId: input.id,
        targetType: "discount_code",
        metadata: { error: "not_found" },
      });
      return { ok: false, error: { kind: "not_found" } };
    }

    const updateResult = updateDiscountCode(findResult.value, input.patch);
    if (!updateResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.update_failed",
        targetId: input.id,
        targetType: "discount_code",
        metadata: { error: updateResult.error.kind },
      });
      return updateResult as unknown as AdminUpdateDiscountCodeResult;
    }

    const persistResult = await this.deps.discountCodeRepo.update(updateResult.value);
    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.update_failed",
        targetId: input.id,
        targetType: "discount_code",
        metadata: { error: persistResult.error.kind === "db_error" ? persistResult.error.message : persistResult.error.kind },
      });
      return persistResult as unknown as AdminUpdateDiscountCodeResult;
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "discount_code.updated",
      targetId: input.id,
      targetType: "discount_code",
      metadata: { patch: input.patch },
    });

    return { ok: true, value: { discountCodeId: input.id } };
  }
}

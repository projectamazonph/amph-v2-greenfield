/**
 * `AdminCreateDiscountCode` — admin creates a new discount code.
 *
 * STORY-050d.
 */
import { Result } from "@/domain/shared/Result";
import {
  createDiscountCode,
  type DiscountType,
} from "@/domain/entities/DiscountCode";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { UlidGenerator } from "@/infra/system/UlidGenerator";

export interface AdminCreateDiscountCodeInput {
  code: string;
  type: DiscountType;
  value: number;
  maxUses?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  courseIds?: readonly string[];
  actorId: string;
}

export type AdminCreateDiscountCodeResult = Result<
  { discountCodeId: string },
  | { kind: "invalid_code"; message: string }
  | { kind: "invalid_value" }
  | { kind: "invalid_max_uses" }
  | { kind: "code_taken" }
  | DiscountCodeRepositoryError
>;

export class AdminCreateDiscountCode {
  constructor(
    private readonly deps: {
      discountCodeRepo: IDiscountCodeRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(
    input: AdminCreateDiscountCodeInput,
  ): Promise<AdminCreateDiscountCodeResult> {
    const id = new UlidGenerator().newId();

    const createResult = createDiscountCode({
      id,
      code: input.code,
      type: input.type,
      value: input.value,
      maxUses: input.maxUses ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      courseIds: input.courseIds ?? [],
    });

    if (!createResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.create_failed",
        targetId: id,
        targetType: "discount_code",
        metadata: { error: createResult.error.kind },
      });
      return createResult as unknown as AdminCreateDiscountCodeResult;
    }

    const persistResult = await this.deps.discountCodeRepo.create(
      createResult.value,
    );

    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "discount_code.create_failed",
        targetId: id,
        targetType: "discount_code",
        metadata: {
          error: persistResult.error.kind === "code_taken"
            ? "code_taken"
            : "db_error",
        },
      });
      return persistResult as unknown as AdminCreateDiscountCodeResult;
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "discount_code.created",
      targetId: id,
      targetType: "discount_code",
      metadata: {
        code: input.code,
        type: input.type,
        value: input.value,
      },
    });

    return { ok: true, value: { discountCodeId: id } };
  }
}

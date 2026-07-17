/**
 * InMemoryDiscountCodeRepository — fast, synchronous test adapter for IDiscountCodeRepository.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 */

import type {
  IDiscountCodeRepository,
  DiscountCodeError,
} from "@/ports/repositories/IDiscountCodeRepository";
import type { DiscountCode } from "@/domain/entities/DiscountCode";
import { Result } from "@/domain/shared/Result";

export class InMemoryDiscountCodeRepository implements IDiscountCodeRepository {
  private codes = new Map<string, DiscountCode>(); // id → DiscountCode
  private codeIndex = new Map<string, string>(); // code (uppercase) → id

  async findByCode(code: string): Promise<DiscountCode | null> {
    const id = this.codeIndex.get(code.toUpperCase());
    if (!id) return null;
    return this.codes.get(id) ?? null;
  }

  async create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeError>> {
    const normalizedCode = code.code.toUpperCase();
    if (this.codeIndex.has(normalizedCode)) {
      return Result.err({ kind: "code_taken" });
    }
    this.codes.set(code.id, Object.freeze({ ...code }));
    this.codeIndex.set(normalizedCode, code.id);
    return Result.ok(code);
  }

  async incrementUsedCount(
    codeId: string,
  ): Promise<Result<DiscountCode, DiscountCodeError>> {
    const code = this.codes.get(codeId);
    if (!code) return Result.err({ kind: "not_found" });
    const updated: DiscountCode = {
      ...code,
      usedCount: code.usedCount + 1,
    };
    this.codes.set(codeId, Object.freeze(updated));
    return Result.ok(updated);
  }

  /** Remove all codes. Call between tests. */
  clear(): void {
    this.codes.clear();
    this.codeIndex.clear();
  }

  /** Pre-seed a discount code. */
  seed(code: DiscountCode): void {
    this.codes.set(code.id, Object.freeze({ ...code }));
    this.codeIndex.set(code.code.toUpperCase(), code.id);
  }
}

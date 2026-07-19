/**
 * InMemoryDiscountCodeRepository — fast, synchronous test adapter for IDiscountCodeRepository.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 * STORY-050d: Admin CRUD (listAll, findById, update, archive).
 */

import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";
import type { DiscountCode } from "@/domain/entities/DiscountCode";
import { Result } from "@/domain/shared/Result";

export class InMemoryDiscountCodeRepository implements IDiscountCodeRepository {
  private codes = new Map<string, DiscountCode>(); // id → DiscountCode
  private codeIndex = new Map<string, string>(); // code (uppercase) → id
  private archived = new Set<string>(); // archived code ids

  async listAll(): Promise<Result<DiscountCode[], DiscountCodeRepositoryError>> {
    try {
      const active = Array.from(this.codes.values()).filter(
        (c) => !this.archived.has(c.id),
      );
      return { ok: true, value: active };
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  async findById(
    id: string,
  ): Promise<Result<DiscountCode | null, DiscountCodeRepositoryError>> {
    try {
      const code = this.codes.get(id);
      if (!code) return { ok: true, value: null };
      if (this.archived.has(id)) {
        return { ok: true, value: null }; // archived codes are hidden
      }
      return { ok: true, value: code };
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  async findByCode(code: string): Promise<DiscountCode | null> {
    const id = this.codeIndex.get(code.toUpperCase());
    if (!id) return null;
    return this.codes.get(id) ?? null;
  }

  async create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeRepositoryError>> {
    try {
      const normalizedCode = code.code.toUpperCase();
      if (this.codeIndex.has(normalizedCode)) {
        return Result.err({ kind: "code_taken" });
      }
      this.codes.set(code.id, Object.freeze({ ...code }));
      this.codeIndex.set(normalizedCode, code.id);
      return Result.ok(code);
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  async update(code: DiscountCode): Promise<Result<void, DiscountCodeRepositoryError>> {
    try {
      if (!this.codes.has(code.id)) {
        return { ok: false, error: { kind: "not_found" } };
      }
      this.codes.set(code.id, Object.freeze({ ...code }));
      return { ok: true, value: undefined };
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  async archive(id: string): Promise<Result<void, DiscountCodeRepositoryError>> {
    try {
      if (!this.codes.has(id)) {
        return { ok: false, error: { kind: "not_found" } };
      }
      this.archived.add(id);
      return { ok: true, value: undefined };
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  async incrementUsedCount(
    codeId: string,
  ): Promise<Result<DiscountCode, DiscountCodeRepositoryError>> {
    try {
      const code = this.codes.get(codeId);
      if (!code) return { ok: false, error: { kind: "not_found" } };
      const updated: DiscountCode = {
        ...code,
        usedCount: code.usedCount + 1,
      };
      this.codes.set(codeId, Object.freeze(updated));
      return Result.ok(updated);
    } catch (e) {
      return { ok: false, error: { kind: "db_error", message: String(e) } };
    }
  }

  /** Remove all codes. Call between tests. */
  clear(): void {
    this.codes.clear();
    this.codeIndex.clear();
    this.archived.clear();
  }

  /** Pre-seed a discount code. */
  seed(code: DiscountCode): void {
    this.codes.set(code.id, Object.freeze({ ...code }));
    this.codeIndex.set(code.code.toUpperCase(), code.id);
  }
}

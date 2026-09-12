/**
 * InMemoryOAuthAccountRepository — test fake for IOAuthAccountRepository.
 *
 * P1-04 (PR-D). Stores OAuthAccount entities in a Map, keyed by id.
 * Mirrors the Prisma adapter's contracts: global (provider,
 * providerUserId) uniqueness, oldest-first user listing, and
 * not_found on updating or deleting a missing row.
 */

import { Result } from "@/domain/shared/Result";
import type { OAuthAccount, OAuthProvider } from "@/domain/entities/OAuthAccount";
import type {
  IOAuthAccountRepository,
  OAuthAccountQueryError,
  OAuthAccountRepoError,
} from "@/ports/repositories/IOAuthAccountRepository";

export class InMemoryOAuthAccountRepository implements IOAuthAccountRepository {
  private readonly rows = new Map<string, OAuthAccount>();

  async create(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountQueryError>> {
    for (const existing of this.rows.values()) {
      if (existing.id === account.id) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on id: ${account.id}`,
        });
      }
      if (
        existing.provider === account.provider &&
        existing.providerUserId === account.providerUserId
      ) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on identity: ${account.provider}`,
        });
      }
    }
    this.rows.set(account.id, account);
    return Result.ok(account);
  }

  async findByProvider(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<Result<OAuthAccount | null, OAuthAccountQueryError>> {
    for (const account of this.rows.values()) {
      if (account.provider === provider && account.providerUserId === providerUserId) {
        return Result.ok(account);
      }
    }
    return Result.ok(null);
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly OAuthAccount[], OAuthAccountQueryError>> {
    const rows = Array.from(this.rows.values())
      .filter((account) => account.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Result.ok(rows);
  }

  async update(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountRepoError>> {
    if (!this.rows.has(account.id)) return Result.err({ kind: "not_found" });
    this.rows.set(account.id, account);
    return Result.ok(account);
  }

  async delete(
    userId: string,
    provider: OAuthProvider,
  ): Promise<Result<void, OAuthAccountRepoError>> {
    for (const [id, account] of this.rows) {
      if (account.userId === userId && account.provider === provider) {
        this.rows.delete(id);
        return Result.ok(undefined);
      }
    }
    return Result.err({ kind: "not_found" });
  }

  /** Test helper: seed a row directly, bypassing the port. */
  seed(account: OAuthAccount): void {
    this.rows.set(account.id, account);
  }

  /** Test helper: clear all rows. */
  clear(): void {
    this.rows.clear();
  }
}

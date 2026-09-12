/**
 * PrismaOAuthAccountRepository — production adapter for
 * IOAuthAccountRepository.
 *
 * P1-04 (PR-D). Provider identities are unique at the DB level;
 * deleting a user cascades to their links, so the adapter never
 * orphans rows.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { isOAuthProvider, type OAuthAccount, type OAuthProvider } from "@/domain/entities/OAuthAccount";
import type {
  IOAuthAccountRepository,
  OAuthAccountQueryError,
  OAuthAccountRepoError,
} from "@/ports/repositories/IOAuthAccountRepository";

interface OAuthAccountRow {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaOAuthAccountRepository implements IOAuthAccountRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountQueryError>> {
    try {
      const row = await this.db.oAuthAccount.create({
        data: {
          id: account.id,
          userId: account.userId,
          provider: account.provider,
          providerUserId: account.providerUserId,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByProvider(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<Result<OAuthAccount | null, OAuthAccountQueryError>> {
    try {
      const row = await this.db.oAuthAccount.findUnique({
        where: { provider_providerUserId: { provider, providerUserId } },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly OAuthAccount[], OAuthAccountQueryError>> {
    try {
      const rows = await this.db.oAuthAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return Result.ok(rows.map((row) => this.mapRow(row)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountRepoError>> {
    try {
      const row = await this.db.oAuthAccount.update({
        where: { id: account.id },
        data: {
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(
    userId: string,
    provider: OAuthProvider,
  ): Promise<Result<void, OAuthAccountRepoError>> {
    try {
      const existing = await this.db.oAuthAccount.findFirst({
        where: { userId, provider },
      });
      if (!existing) return Result.err({ kind: "not_found" });
      await this.db.oAuthAccount.delete({ where: { id: existing.id } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: OAuthAccountRow): OAuthAccount {
    if (!isOAuthProvider(row.provider)) {
      throw new Error(`OAuth account ${row.id} has an invalid provider: "${row.provider}"`);
    }
    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      providerUserId: row.providerUserId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

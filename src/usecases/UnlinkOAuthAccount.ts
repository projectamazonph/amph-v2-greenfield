/**
 * UnlinkOAuthAccount — remove one provider link (P1-04, PR-D).
 *
 * Guards against lockout: refusing to remove the user's last auth
 * method. A non-empty password hash counts as a method, as does any
 * other surviving link. Audited as `oauth_account.unlinked` /
 * `oauth_account.unlink_failed` with the user as the actor.
 */

import { Result } from "@/domain/shared/Result";
import type { OAuthProvider } from "@/domain/entities/OAuthAccount";
import type { IOAuthAccountRepository } from "@/ports/repositories/IOAuthAccountRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface UnlinkOAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
}

export type UnlinkOAuthAccountError =
  | { kind: "link_not_found" }
  | { kind: "last_auth_method" }
  | { kind: "db_error"; message: string };

export type UnlinkOAuthAccountResult = Result<void, UnlinkOAuthAccountError>;

export interface UnlinkOAuthAccountDeps {
  oauthAccountRepo: IOAuthAccountRepository;
  userRepo: UserRepository;
  recordAuditLog: RecordAuditLog;
}

export class UnlinkOAuthAccount {
  constructor(private readonly deps: UnlinkOAuthAccountDeps) {}

  async execute(input: UnlinkOAuthAccountInput): Promise<UnlinkOAuthAccountResult> {
    const audit = (
      action: "oauth_account.unlinked" | "oauth_account.unlink_failed",
      metadata: Record<string, unknown>,
    ) =>
      this.deps.recordAuditLog.execute({
        actorId: input.userId,
        action,
        targetType: "oauth_account",
        targetId: `${input.provider}:${input.userId}`,
        metadata,
      });

    const links = await this.deps.oauthAccountRepo.listByUser(input.userId);
    if (!links.ok) {
      await audit("oauth_account.unlink_failed", {
        outcome: "db_error",
        message: links.error.message,
      });
      return Result.err({ kind: "db_error", message: links.error.message });
    }
    if (!links.value.some((link) => link.provider === input.provider)) {
      await audit("oauth_account.unlink_failed", { outcome: "link_not_found" });
      return Result.err({ kind: "link_not_found" });
    }

    const hashResult = await this.deps.userRepo.getPasswordHash(input.userId);
    if (Result.isErr(hashResult)) {
      await audit("oauth_account.unlink_failed", { outcome: "db_error" });
      return Result.err({ kind: "db_error", message: "password lookup failed" });
    }
    const hasPassword = hashResult.value !== "";
    const otherLinks = links.value.filter((link) => link.provider !== input.provider);
    if (!hasPassword && otherLinks.length === 0) {
      await audit("oauth_account.unlink_failed", { outcome: "last_auth_method" });
      return Result.err({ kind: "last_auth_method" });
    }

    const deleted = await this.deps.oauthAccountRepo.delete(input.userId, input.provider);
    if (!deleted.ok) {
      const outcome = deleted.error.kind;
      await audit("oauth_account.unlink_failed", {
        outcome,
        message: outcome === "db_error" ? deleted.error.message : undefined,
      });
      if (outcome === "not_found") {
        return Result.err({ kind: "link_not_found" });
      }
      return Result.err({ kind: "db_error", message: deleted.error.message });
    }

    await audit("oauth_account.unlinked", { outcome: "success", provider: input.provider });
    return Result.ok(undefined);
  }
}

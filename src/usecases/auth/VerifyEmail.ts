/**
 * VerifyEmail use case — STORY-007.
 *
 * Validates a verification token from the user's email link and,
 * if valid, marks the token as used and timestamps the user's
 * email as verified.
 *
 * The token in the URL is hashed with SHA-256 before being looked
 * up. The raw token never touches the repository.
 *
 * Errors:
 *   - invalid_token:        no record matches the hashed token
 *   - token_expired:        record exists, expiresAt < now
 *   - token_already_used:   record.usedAt is set
 *
 * Side effects on success:
 *   - emailVerifications.markUsed(record.id)
 *   - users.update(record.userId, { emailVerifiedAt: now })
 *
 * The user's verificationStatus is NOT changed here. The
 * `emailVerifiedAt` timestamp is the source of truth; the status
 * is derived from it elsewhere.
 */

import { createHash } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import type { User } from "@/domain/entities/User";
import type {
  EmailVerificationRepository,
} from "@/ports/repositories/EmailVerificationRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { Clock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";

export type VerifyEmailInput = { token: string };
export type VerifyEmailOutput = { user: User };
export type VerifyEmailError =
  | { kind: "invalid_token" }
  | { kind: "token_expired" }
  | { kind: "token_already_used" };

export interface VerifyEmailDeps {
  emailVerifications: EmailVerificationRepository;
  users: UserRepository;
  clock: Clock;
  logger: Logger;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export class VerifyEmail {
  constructor(private readonly deps: VerifyEmailDeps) {}

  async execute(
    input: VerifyEmailInput,
  ): Promise<Result<VerifyEmailOutput, VerifyEmailError>> {
    const tokenHash = sha256(input.token);

    const recordResult = await this.deps.emailVerifications.findByTokenHash(
      tokenHash,
    );
    if (!recordResult.ok) {
      // repository returns not_found or db_error; both surface as
      // invalid_token to the user (don't leak DB state via error codes).
      this.deps.logger.warn("verify_email.token_not_found", {
        tokenHashPrefix: tokenHash.slice(0, 8),
      });
      return Result.err({ kind: "invalid_token" });
    }
    const record = recordResult.value;

    if (record.usedAt) {
      this.deps.logger.info("verify_email.token_already_used", {
        userId: record.userId,
      });
      return Result.err({ kind: "token_already_used" });
    }

    if (record.expiresAt.getTime() < this.deps.clock.now().getTime()) {
      this.deps.logger.info("verify_email.token_expired", {
        userId: record.userId,
        expiresAt: record.expiresAt.toISOString(),
      });
      return Result.err({ kind: "token_expired" });
    }

    // Token is valid. Mark used first, then update user. If the user
    // update fails for any reason, the token is still burned — the
    // user will have to request a new verification email.
    const marked = await this.deps.emailVerifications.markUsed(record.id);
    if (!marked.ok) {
      this.deps.logger.error("verify_email.mark_used_failed", {
        recordId: record.id,
        error: marked.error,
      });
      return Result.err({ kind: "invalid_token" });
    }

    const now = this.deps.clock.now();
    const userResult = await this.deps.users.update(record.userId, {
      emailVerifiedAt: now,
    } as Parameters<UserRepository["update"]>[1]);
    if (!userResult.ok) {
      this.deps.logger.error("verify_email.user_update_failed", {
        userId: record.userId,
        error: userResult.error,
      });
      return Result.err({ kind: "invalid_token" });
    }

    this.deps.logger.info("verify_email.success", {
      userId: record.userId,
    });
    return Result.ok({ user: userResult.value });
  }
}

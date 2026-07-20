/**
 * ResetPassword use case — STORY-008.
 *
 * Consumes a password-reset token, validates the new password,
 * hashes it, updates the user, marks the token used, and
 * invalidates all of the user's existing sessions.
 *
 * Errors:
 *   - invalid_token:        no record for the hashed token
 *   - token_expired:        token past expiresAt
 *   - token_already_used:   token's usedAt is set
 *   - weak_password:        new password fails strength check
 */

import { createHash } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PasswordResetRepository } from "@/ports/repositories/PasswordResetRepository";
import type { Clock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MIN_SCORE = 3;

export type ResetPasswordInput = { token: string; newPassword: string };
export type ResetPasswordOutput = { userId: string };
export type ResetPasswordError =
  | { kind: "invalid_token" }
  | { kind: "token_expired" }
  | { kind: "token_already_used" }
  | { kind: "weak_password"; score: number }
  | { kind: "db_error"; message: string };

export interface ResetPasswordDeps {
  users: UserRepository;
  passwordResets: PasswordResetRepository;
  sessions: SessionRepository;
  clock: Clock;
  logger: Logger;
  email: EmailSender;
  hasher: PasswordHasher;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function assessPassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export class ResetPassword {
  constructor(private readonly deps: ResetPasswordDeps) {}

  async execute(
    input: ResetPasswordInput,
  ): Promise<Result<ResetPasswordOutput, ResetPasswordError>> {
    if (input.newPassword.length < PASSWORD_MIN_LENGTH) {
      return Result.err({
        kind: "weak_password",
        score: assessPassword(input.newPassword),
      });
    }
    const score = assessPassword(input.newPassword);
    if (score < PASSWORD_MIN_SCORE) {
      return Result.err({ kind: "weak_password", score });
    }

    const tokenHash = sha256(input.token);
    const findResult = await this.deps.passwordResets.findByTokenHash(tokenHash);
    if (!findResult.ok) {
      return Result.err({ kind: "invalid_token" });
    }
    const record = findResult.value;

    if (record.usedAt !== null) {
      return Result.err({ kind: "token_already_used" });
    }
    if (record.expiresAt.getTime() <= this.deps.clock.now().getTime()) {
      return Result.err({ kind: "token_expired" });
    }

    // Hash the new password.
    const hashResult = await this.deps.hasher.hash(input.newPassword);
    if (!hashResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "Failed to hash the new password",
      });
    }

    // Persist the new password hash.
    const updateResult = await this.deps.users.update(record.userId, {
      passwordHash: hashResult.value,
    });
    if (!updateResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "Failed to update user password",
      });
    }

    // Mark the token used.
    await this.deps.passwordResets.markUsed(record.id);

    // Revoke all existing sessions.
    await this.deps.sessions.deleteAllForUser(record.userId);

    // Send confirmation email.
    const user = updateResult.value;
    await this.deps.email.send({
      to: user.email,
      subject: "Your Project Amazon PH Academy password was changed",
      react: null,
    } as unknown as Parameters<EmailSender["send"]>[0]);

    this.deps.logger.info("reset_password.success", { userId: record.userId });
    return Result.ok({ userId: record.userId });
  }
}

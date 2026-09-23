/**
 * AdminSetUserPassword — admin directly sets or resets a user's password
 * without requiring the user to know their current password.
 *
 * Hashes the new password, persists it, invalidates all existing sessions
 * (so the user is logged out everywhere), and sends an optional notification
 * email telling them their password was changed by an admin.
 *
 * Password strength is validated server-side (same rules as ResetPassword):
 * minimum 8 chars, minimum score of 3 using a simple scoring heuristic.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { PasswordChangedRenderer } from "@/ports/email/PasswordChangedRenderer";
import type { Logger } from "@/ports/observability/Logger";
import type { Clock } from "@/ports/system/Clock";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MIN_SCORE = 3;

function assessPassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export interface AdminSetUserPasswordInput {
  userId: string;
  actorId: string;
  newPassword: string;
  sendNotificationEmail: boolean;
}

export type AdminSetUserPasswordError =
  | { kind: "user_not_found" }
  | { kind: "weak_password"; score: number }
  | { kind: "hash_error" }
  | { kind: "db_error"; message: string };

export interface AdminSetUserPasswordOutput {
  userId: string;
  sessionsRevoked: boolean;
}

export type AdminSetUserPasswordResult = Result<
  AdminSetUserPasswordOutput,
  AdminSetUserPasswordError
>;

export interface AdminSetUserPasswordDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  passwordHasher: PasswordHasher;
  recordAuditLog: RecordAuditLog;
  emailSender: EmailSender;
  passwordChangedEmailRenderer: PasswordChangedRenderer;
  logger: Logger;
  clock: Clock;
}

export class AdminSetUserPassword {
  constructor(private readonly deps: AdminSetUserPasswordDeps) {}

  async execute(input: AdminSetUserPasswordInput): Promise<AdminSetUserPasswordResult> {
    const password = input.newPassword;

    if (password.length < PASSWORD_MIN_LENGTH) {
      return Result.err({ kind: "weak_password", score: 0 });
    }

    const score = assessPassword(password);
    if (score < PASSWORD_MIN_SCORE) {
      return Result.err({ kind: "weak_password", score });
    }

    const hashResult = await this.deps.passwordHasher.hash(password);
    if (!hashResult.ok) {
      return Result.err({ kind: "hash_error" });
    }

    const updateResult = await this.deps.userRepo.update(input.userId, {
      passwordHash: hashResult.value,
    });

    if (!updateResult.ok) {
      if (updateResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      if (updateResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: updateResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Unknown error" });
    }

    const sessionsResult = await this.deps.sessionRepo.deleteAllForUser(input.userId);
    const sessionsRevoked = sessionsResult.ok;

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "user.password_changed_by_admin",
      targetType: "user",
      targetId: input.userId,
      metadata: { sessionsRevoked },
    });

    if (input.sendNotificationEmail) {
      const userResult = await this.deps.userRepo.findById(input.userId);
      if (userResult.ok) {
        const react = this.deps.passwordChangedEmailRenderer.render({
          firstName: userResult.value.firstName,
          changedAt: this.deps.clock.now(),
        });
        const sendResult = await this.deps.emailSender.send({
          to: userResult.value.email,
          subject: "Your Project Amazon PH Academy password was changed",
          react,
        });
        if (!sendResult.ok) {
          this.deps.logger.warn("admin_set_user_password.email_send_failed", {
            userId: input.userId,
            error: sendResult.error,
          });
        }
      }
    }

    return Result.ok({ userId: input.userId, sessionsRevoked });
  }
}

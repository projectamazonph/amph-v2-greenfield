/**
 * AdminUpdateUser — admin updates a user's profile fields (name, role).
 *
 * Used on the admin user detail page to correct names, change roles, or
 * promote a student to instructor/admin without going through checkout.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { Role } from "@/domain/entities/User";

export interface AdminUpdateUserInput {
  userId: string;
  actorId: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
}

export type AdminUpdateUserError =
  | { kind: "user_not_found" }
  | { kind: "invalid_name" }
  | { kind: "invalid_role" }
  | { kind: "cannot_change_own_role" }
  | { kind: "db_error"; message: string };

export interface AdminUpdateUserOutput {
  userId: string;
}

export type AdminUpdateUserResult = Result<AdminUpdateUserOutput, AdminUpdateUserError>;

export interface AdminUpdateUserDeps {
  userRepo: UserRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminUpdateUser {
  constructor(private readonly deps: AdminUpdateUserDeps) {}

  async execute(input: AdminUpdateUserInput): Promise<AdminUpdateUserResult> {
    const patch: Parameters<typeof this.deps.userRepo.update>[1] = {};
    const metadata: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
      const trimmed = input.firstName.trim();
      if (!trimmed) return Result.err({ kind: "invalid_name" });
      patch.firstName = trimmed;
      metadata.firstName = trimmed;
    }

    if (input.lastName !== undefined) {
      const trimmed = input.lastName.trim();
      if (!trimmed) return Result.err({ kind: "invalid_name" });
      patch.lastName = trimmed;
      metadata.lastName = trimmed;
    }

    if (input.role !== undefined) {
      const validRoles: Role[] = ["STUDENT", "INSTRUCTOR", "ADMIN"];
      if (!validRoles.includes(input.role)) {
        return Result.err({ kind: "invalid_role" });
      }
      if (input.userId === input.actorId) {
        return Result.err({ kind: "cannot_change_own_role" });
      }
      patch.role = input.role;
      metadata.role = input.role;
    }

    if (Object.keys(patch).length === 0) {
      return Result.ok({ userId: input.userId });
    }

    const result = await this.deps.userRepo.update(input.userId, patch);

    if (!result.ok) {
      if (result.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      if (result.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: result.error.message });
      }
      return Result.err({ kind: "db_error", message: "Unknown error" });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "user.profile_updated",
      targetType: "user",
      targetId: input.userId,
      metadata,
    });

    return Result.ok({ userId: input.userId });
  }
}

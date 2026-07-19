/**
 * ImpersonateUser — issue a fresh session for a target user, on behalf
 * of an admin.
 *
 * STORY-047: Admin user detail + impersonate.
 *
 * The admin (caller) is identified by `adminUserId`. The target user
 * is identified by `targetUserId`. The use case:
 *  1. Verifies the target user exists
 *  2. Verifies the target is NOT an admin (admins cannot impersonate
     each other — privilege separation, prevents lockout)
 *  3. Verifies the admin caller exists (sanity check)
 *  4. Issues a fresh session row (so the impersonation shows up in
     "active sessions" + can be revoked)
 *  5. Signs a new JWT for the target user
 *  6. Returns { token, expiresAt, targetUser }
 *
 * The server action is responsible for:
 *  - Verifying the caller is actually an admin (via requireAdmin)
 *  - Planting the returned token as the session cookie
 *  - Storing the admin's original session token in a separate cookie
     (amph_admin_session) for "Stop impersonating"
 *  - Redirecting to the user's view
 *
 * The use case does NOT touch cookies — that's a side effect owned
 * by the app layer.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { JwtService } from "@/ports/security/JwtService";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { User } from "@/domain/entities/User";

const SESSION_TTL = "7d";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Input / Output types ───────────────────────────────────────────────────

export interface ImpersonateUserInput {
  targetUserId: string;
  adminUserId: string;
}

export type ImpersonateUserError =
  | { kind: "target_user_not_found" }
  | { kind: "admin_user_not_found" }
  | { kind: "cannot_impersonate_admin" }
  | { kind: "cannot_impersonate_self" }
  | { kind: "db_error"; message: string }
  | { kind: "token_error"; message: string };

export type ImpersonateUserResult = Result<
  {
    token: string;
    expiresAt: Date;
    targetUser: User;
  },
  ImpersonateUserError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface ImpersonateUserDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  jwt: JwtService;
  clock: Clock;
  idGen: IdGenerator;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class ImpersonateUser {
  constructor(private readonly deps: ImpersonateUserDeps) {}

  async execute(input: ImpersonateUserInput): Promise<ImpersonateUserResult> {
    // ── 1. Target user ───────────────────────────────────
    const targetResult = await this.deps.userRepo.findById(input.targetUserId);
    if (!targetResult.ok) {
      if (targetResult.error.kind === "not_found") {
        return Result.err({ kind: "target_user_not_found" });
      }
      if (targetResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: targetResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch target user" });
    }
    const targetUser = targetResult.value;

    // ── 2. Reject admins ──────────────────────────────────
    if (targetUser.role === "ADMIN") {
      return Result.err({ kind: "cannot_impersonate_admin" });
    }

    // ── 3. Reject self-impersonation ──────────────────────
    if (targetUser.id === input.adminUserId) {
      return Result.err({ kind: "cannot_impersonate_self" });
    }

    // ── 4. Admin caller (sanity check) ────────────────────
    const adminResult = await this.deps.userRepo.findById(input.adminUserId);
    if (!adminResult.ok) {
      if (adminResult.error.kind === "not_found") {
        return Result.err({ kind: "admin_user_not_found" });
      }
      if (adminResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: adminResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch admin user" });
    }
    if (adminResult.value.role !== "ADMIN") {
      // Defensive: the server action should have already checked via
      // requireAdmin, but verify here too.
      return Result.err({ kind: "db_error", message: "Caller is not an admin" });
    }

    // ── 5. Create session row ────────────────────────────
    const sessionId = this.deps.idGen.newId();
    const expiresAt = new Date(this.deps.clock.now().getTime() + SESSION_TTL_MS);
    const sessionResult = await this.deps.sessionRepo.create({
      id: sessionId,
      userId: targetUser.id,
      tokenHash: `jwt:${sessionId}`,
      expiresAt,
    });
    if (!sessionResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to create session" });
    }

    // ── 6. Sign JWT ───────────────────────────────────────
    const jwtResult = await this.deps.jwt.sign(
      { sub: targetUser.id, sessionId, role: targetUser.role },
      SESSION_TTL,
    );
    if (!jwtResult.ok) {
      return Result.err({ kind: "token_error", message: "jwt sign failed" });
    }

    // ── 7. TODO: Audit log (STORY-X) ──────────────────────
    // AGENTS.md says every admin action logs to AuditLog. There's no
    // AuditLog port yet (see SignUp.ts TODO). For now, log via the
    // structured logger pattern.
    console.log(
      `[impersonate] admin=${input.adminUserId} target=${targetUser.id} session=${sessionId}`,
    );

    return Result.ok({
      token: jwtResult.value,
      expiresAt,
      targetUser,
    });
  }
}

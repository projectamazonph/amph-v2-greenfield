/**
 * Login use case — Story 012 / 013.
 *
 * Authenticates a user by email + password, creates a JWT session token,
 * and persists a session record (for admin/revocation).
 *
 * SRP: One responsibility — authentication.
 * Fail Fast: Invalid inputs rejected before touching the database.
 * No exceptions cross the layer boundary — Result<T, E> only.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { JwtService } from "@/ports/security/JwtService";

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginError =
  | { kind: "user_not_found" }
  | { kind: "wrong_password" }
  | { kind: "account_suspended" }
  | { kind: "account_locked" }
  | { kind: "db_error"; message: string }
  | { kind: "token_error"; message: string };

export type LoginOutput =
  | { ok: true; sessionToken: string; userId: string; expiresAt: Date }
  | { ok: false; error: LoginError };

const SESSION_TTL = "7d"; // jose duration string

export class Login {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionRepo: SessionRepository,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
    private readonly jwt: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Fail Fast: email format
    if (!input.email.includes("@")) {
      return { ok: false, error: { kind: "user_not_found" } };
    }

    // Find user
    const userResult = await this.userRepo.findByEmail(input.email);
    if (Result.isErr(userResult)) {
      if (userResult.error.kind === "not_found" || userResult.error.kind === "email_taken") {
        return { ok: false, error: { kind: "user_not_found" } };
      }
      return { ok: false, error: { kind: "db_error", message: "find user failed" } };
    }

    const user = userResult.value;

    // Check account status
    if (user.verificationStatus === "SUSPENDED") {
      return { ok: false, error: { kind: "account_suspended" } };
    }

    // Verify password
    const hashResult = await this.userRepo.getPasswordHash(user.id);
    if (Result.isErr(hashResult)) {
      return { ok: false, error: { kind: "wrong_password" } };
    }
    const verifyResult = await this.hasher.verify(input.password, hashResult.value);
    if (Result.isErr(verifyResult) || !verifyResult.value) {
      return { ok: false, error: { kind: "wrong_password" } };
    }

    // Create session record in DB (for admin view / revocation)
    const sessionId = this.idGen.newId();
    const expiresAt = new Date(this.clock.now().getTime() + 7 * 24 * 60 * 60 * 1000);
    const sessionResult = await this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      tokenHash: `jwt:${sessionId}`,
      expiresAt,
    });
    if (Result.isErr(sessionResult)) {
      return { ok: false, error: { kind: "db_error", message: "session create failed" } };
    }

    // Sign JWT — this IS the session token sent to the client
    const jwtResult = await this.jwt.sign(
      { sub: user.id, sessionId, role: user.role },
      SESSION_TTL,
    );
    if (Result.isErr(jwtResult)) {
      return { ok: false, error: { kind: "token_error", message: "jwt sign failed" } };
    }

    return {
      ok: true,
      sessionToken: jwtResult.value,
      userId: user.id,
      expiresAt,
    };
  }
}

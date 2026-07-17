/**
 * Login use case — Story 012.
 *
 * Authenticates a user by email + password, then creates a session.
 *
 * SRP: One responsibility — authentication.
 * Fail Fast: Invalid inputs rejected before touching the database.
 * No exceptions cross the layer boundary — Result<T, E> only.
 */

import { Result } from "@/lib/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { SessionRepository, SessionRecord } from "@/ports/repositories/SessionRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface LoginInput {
  email: string;
  password: string;
}

export type LoginError =
  | { kind: "user_not_found" }
  | { kind: "wrong_password" }
  | { kind: "account_suspended" }
  | { kind: "account_locked" }
  | { kind: "db_error"; message: string };

export type LoginOutput =
  | { ok: true; sessionId: string; userId: string; expiresAt: Date }
  | { ok: false; error: LoginError };

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class Login {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionRepo: SessionRepository,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Fail Fast: email format
    if (!input.email.includes("@")) {
      return { ok: false, error: { kind: "user_not_found" } };
    }

    // Find user
    const userResult = await this.userRepo.findByEmail(input.email);
    if (Result.isErr(userResult)) {
      return { ok: false, error: { kind: "db_error", message: "find user failed" } };
    }
    if (!userResult.ok) {
      // not_found or email_taken — treat both as "user not found" to avoid user enumeration
      return { ok: false, error: { kind: "user_not_found" } };
    }

    const user = userResult.value;

    // Check account status
    if (user.verificationStatus === "SUSPENDED") {
      return { ok: false, error: { kind: "account_suspended" } };
    }

    // Verify password — fetch the stored hash, then verify
    const hashResult = await this.userRepo.getPasswordHash(user.id);
    if (Result.isErr(hashResult)) {
      // User was found above, so this should not happen — treat as wrong password
      return { ok: false, error: { kind: "wrong_password" } };
    }
    const verifyResult = await this.hasher.verify(input.password, hashResult.value);
    if (Result.isErr(verifyResult) || !verifyResult.value) {
      return { ok: false, error: { kind: "wrong_password" } };
    }

    // Create session
    const sessionId = this.idGen.newId();
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    const sessionResult = await this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      tokenHash: `token:${sessionId}`, // TODO: sign with JWT (STORY-013)
      expiresAt,
    });

    if (Result.isErr(sessionResult)) {
      return { ok: false, error: { kind: "db_error", message: "session create failed" } };
    }

    return {
      ok: true,
      sessionId,
      userId: user.id,
      expiresAt,
    };
  }
}

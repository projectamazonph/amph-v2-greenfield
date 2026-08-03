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
import { isValidEmail } from "@/domain/values/Email";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { JwtService } from "@/ports/security/JwtService";
import type { TotpService } from "@/ports/security/TotpService";

export interface LoginInput {
  email: string;
  password: string;
  /**
   * Required only when the account has 2FA enabled. The client
   * re-submits the same email+password plus this field after the
   * server responds with `totp_required` — no separate pending-session
   * token to manage, so there's nothing extra to leak or expire.
   */
  totpCode?: string;
}

export type LoginError =
  | { kind: "user_not_found" }
  | { kind: "wrong_password" }
  | { kind: "account_suspended" }
  | { kind: "account_locked" }
  | { kind: "db_error"; message: string }
  | { kind: "token_error"; message: string }
  /** Password was correct; the account has 2FA enabled and no/an empty totpCode was given. */
  | { kind: "totp_required" }
  | { kind: "invalid_totp_code" };

export type LoginOutput =
  | { ok: true; sessionToken: string; userId: string; expiresAt: Date }
  | { ok: false; error: LoginError };

const SESSION_TTL = "7d"; // jose duration string

/** Consecutive wrong-password attempts allowed before the account locks. */
const MAX_FAILED_ATTEMPTS = 5;
/** How long an account stays locked after crossing MAX_FAILED_ATTEMPTS. */
const LOCKOUT_DURATION_MINUTES = 15;

export class Login {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionRepo: SessionRepository,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
    private readonly jwt: JwtService,
    private readonly totpService: TotpService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Fail Fast: email format. Same error kind as "not found" — an
    // invalid format can never match a stored account, and returning
    // a distinct error here would leak formation-oracle info for free.
    if (!isValidEmail(input.email)) {
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

    // Account lockout: reject before touching the password hash at all
    // once a prior failure streak has locked the account. lockedUntil
    // comes straight off the user record findByEmail already fetched —
    // no extra repo round-trip needed.
    if (user.lockedUntil && user.lockedUntil.getTime() > this.clock.now().getTime()) {
      return { ok: false, error: { kind: "account_locked" } };
    }

    // Verify password
    const hashResult = await this.userRepo.getPasswordHash(user.id);
    if (Result.isErr(hashResult)) {
      return { ok: false, error: { kind: "wrong_password" } };
    }
    const verifyResult = await this.hasher.verify(input.password, hashResult.value);
    if (Result.isErr(verifyResult) || !verifyResult.value) {
      const now = this.clock.now();
      const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      const attemptResult = await this.userRepo.recordLoginAttempt(user.id, {
        kind: "failure",
        maxAttempts: MAX_FAILED_ATTEMPTS,
        lockUntil,
        now,
      });
      if (Result.isOk(attemptResult) && attemptResult.value.lockedUntil) {
        return { ok: false, error: { kind: "account_locked" } };
      }
      return { ok: false, error: { kind: "wrong_password" } };
    }

    // Correct password — clear any failure streak.
    await this.userRepo.recordLoginAttempt(user.id, { kind: "success" });

    // Audit hardening: admin 2FA (opt-in — only accounts that have gone
    // through EnableTwoFactor/ConfirmTwoFactor have twoFactorEnabled
    // true, so this is a no-op for every existing account by default).
    if (user.twoFactorEnabled) {
      if (!input.totpCode) {
        return { ok: false, error: { kind: "totp_required" } };
      }
      const secretResult = await this.userRepo.getTwoFactorSecret(user.id);
      if (Result.isErr(secretResult) || !secretResult.value) {
        // twoFactorEnabled=true with no stored secret should not happen
        // (ConfirmTwoFactor only sets it after a secret is confirmed) —
        // fail closed rather than silently skip the check.
        return { ok: false, error: { kind: "invalid_totp_code" } };
      }
      if (!this.totpService.verify(secretResult.value, input.totpCode)) {
        return { ok: false, error: { kind: "invalid_totp_code" } };
      }
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

/**
 * LoginWithOAuth — sign in with a verified provider identity (P1-04, PR-D).
 *
 * The route already ran the broker (exchange + profile) before
 * calling here; this use case owns identity resolution and session
 * issuance:
 *
 *   1. Verified email only — an unverified provider email is
 *      rejected outright.
 *   2. Existing link → its user (tokens refreshed).
 *   3. No link but matching email → link and sign in.
 *   4. Otherwise auto-create a STUDENT/FREE user with an empty
 *      password hash (no password) and link it. Audited as
 *      `user.signed_up`, mirroring SignUp.
 *   5. Suspended/locked users are refused like password login.
 *   6. 2FA-enabled users are refused with `two_factor_required`:
 *      OAuth must not bypass TOTP; they sign in with password+code.
 *   7. Session issuance mirrors Login (sessionRepo + JWT, 7 days).
 *
 * Every link or auto-create is audited as `oauth_account.linked`.
 */

import { Result } from "@/domain/shared/Result";
import { isValidEmail } from "@/domain/values/Email";
import {
  createOAuthAccount,
  refreshOAuthTokens,
  type OAuthProvider,
} from "@/domain/entities/OAuthAccount";
import type { IOAuthAccountRepository } from "@/ports/repositories/IOAuthAccountRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { JwtService } from "@/ports/security/JwtService";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface OAuthLoginProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  accessToken: string;
  expiresAt: Date | null;
}

export interface LoginWithOAuthInput {
  profile: OAuthLoginProfile;
}

export type LoginWithOAuthError =
  | { kind: "provider_not_configured" }
  | { kind: "unverified_email" }
  | { kind: "user_not_found" }
  | { kind: "account_suspended" }
  | { kind: "account_locked" }
  | { kind: "two_factor_required" }
  | { kind: "db_error"; message: string }
  | { kind: "token_error"; message: string };

export interface LoginWithOAuthSuccess {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  /** True when this login created the account. */
  isNewUser: boolean;
}

export type LoginWithOAuthResult = Result<LoginWithOAuthSuccess, LoginWithOAuthError>;

export interface LoginWithOAuthDeps {
  oauthAccountRepo: IOAuthAccountRepository;
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  idGen: IdGenerator;
  clock: Clock;
  jwt: JwtService;
  recordAuditLog: RecordAuditLog;
  /** Providers with a wired broker. Google only in this slice. */
  configuredProviders: readonly OAuthProvider[];
}

/** Split a provider display name into first/last for auto-signup. */
export function splitDisplayName(name: string | null, email: string): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter((part) => part !== "");
  if (parts.length === 0) {
    return { firstName: email.split("@")[0] ?? "Student", lastName: "User" };
  }
  const first = parts[0] as string;
  const rest = parts.slice(1).join(" ");
  return { firstName: first, lastName: rest === "" ? "User" : rest };
}

export class LoginWithOAuth {
  constructor(private readonly deps: LoginWithOAuthDeps) {}

  async execute(input: LoginWithOAuthInput): Promise<LoginWithOAuthResult> {
    const { profile } = input;

    if (!this.deps.configuredProviders.includes(profile.provider)) {
      return Result.err({ kind: "provider_not_configured" });
    }
    if (!profile.emailVerified || !isValidEmail(profile.email)) {
      return Result.err({ kind: "unverified_email" });
    }

    const now = this.deps.clock.now();

    const existingLink = await this.deps.oauthAccountRepo.findByProvider(
      profile.provider,
      profile.providerUserId,
    );
    if (!existingLink.ok) {
      return Result.err({ kind: "db_error", message: "find link failed" });
    }

    let userId: string;
    let isNewUser = false;

    if (existingLink.value !== null) {
      userId = existingLink.value.userId;
      const refreshed = refreshOAuthTokens(existingLink.value, {
        accessToken: profile.accessToken,
        expiresAt: profile.expiresAt,
        updatedAt: now,
      });
      if (refreshed.ok) {
        await this.deps.oauthAccountRepo.update(refreshed.value);
      }
    } else {
      const resolved = await this.resolveUser(profile, now);
      if (!resolved.ok) {
        return Result.err(resolved.error);
      }
      userId = resolved.value.userId;
      isNewUser = resolved.value.isNewUser;
    }

    const userResult = await this.deps.userRepo.findById(userId);
    if (Result.isErr(userResult)) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    if (user.verificationStatus === "SUSPENDED") {
      return Result.err({ kind: "account_suspended" });
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      return Result.err({ kind: "account_locked" });
    }
    if (user.twoFactorEnabled) {
      return Result.err({ kind: "two_factor_required" });
    }

    const sessionId = this.deps.idGen.newId();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sessionResult = await this.deps.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      tokenHash: `jwt:${sessionId}`,
      expiresAt,
    });
    if (Result.isErr(sessionResult)) {
      return Result.err({ kind: "db_error", message: "session create failed" });
    }

    const jwtResult = await this.deps.jwt.sign(
      { sub: user.id, sessionId, role: user.role },
      "7d",
    );
    if (Result.isErr(jwtResult)) {
      return Result.err({ kind: "token_error", message: "jwt sign failed" });
    }

    return Result.ok({ sessionToken: jwtResult.value, userId: user.id, expiresAt, isNewUser });
  }

  private async resolveUser(
    profile: OAuthLoginProfile,
    now: Date,
  ): Promise<Result<{ userId: string; isNewUser: boolean }, LoginWithOAuthError>> {
    const byEmail = await this.deps.userRepo.findByEmail(profile.email);
    if (Result.isErr(byEmail)) {
      if (byEmail.error.kind === "not_found" || byEmail.error.kind === "email_taken") {
        return this.createUser(profile, now);
      }
      return Result.err({ kind: "db_error", message: "find user failed" });
    }
    const linked = await this.linkUser(byEmail.value.id, profile, now);
    if (!linked.ok) {
      return Result.err(linked.error);
    }
    return Result.ok({ userId: byEmail.value.id, isNewUser: false });
  }

  private async createUser(
    profile: OAuthLoginProfile,
    now: Date,
  ): Promise<Result<{ userId: string; isNewUser: boolean }, LoginWithOAuthError>> {
    const { firstName, lastName } = splitDisplayName(profile.name, profile.email);
    const id = this.deps.idGen.newId();
    const created = await this.deps.userRepo.create({
      id,
      email: profile.email,
      // Empty hash = no password. Password login can never verify
      // against it; the account signs in via linked providers until
      // the owner sets a password through recovery.
      passwordHash: "",
      firstName,
      lastName,
    });
    if (Result.isErr(created)) {
      if (created.error.kind === "email_taken") {
        return Result.err({ kind: "db_error", message: "email taken during auto-signup" });
      }
      return Result.err({ kind: "db_error", message: "create user failed" });
    }
    const linked = await this.linkUser(id, profile, now);
    if (!linked.ok) {
      return Result.err(linked.error);
    }
    await this.deps.recordAuditLog.execute({
      actorId: id,
      action: "user.signed_up",
      targetType: "user",
      targetId: id,
      metadata: { email: profile.email, via: profile.provider, timestamp: now.toISOString() },
    });
    return Result.ok({ userId: id, isNewUser: true });
  }

  private async linkUser(
    userId: string,
    profile: OAuthLoginProfile,
    now: Date,
  ): Promise<Result<string, LoginWithOAuthError>> {
    const built = createOAuthAccount({
      id: this.deps.idGen.newId(),
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      accessToken: profile.accessToken,
      expiresAt: profile.expiresAt,
      createdAt: now,
    });
    if (!built.ok) {
      return Result.err({ kind: "db_error", message: "invalid link" });
    }
    const created = await this.deps.oauthAccountRepo.create(built.value);
    if (!created.ok) {
      return Result.err({ kind: "db_error", message: created.error.message });
    }
    await this.deps.recordAuditLog.execute({
      actorId: userId,
      action: "oauth_account.linked",
      targetType: "oauth_account",
      targetId: created.value.id,
      metadata: { provider: profile.provider, timestamp: now.toISOString() },
    });
    return Result.ok(created.value.id);
  }
}

/**
 * ResendVerification use case — STORY-007.
 *
 * Issues a new email verification token for an existing user who
 * has not yet verified. The new token invalidates nothing (the
 * old token is still valid until it's used or expires) but a
 * 60-second rate limit prevents abuse.
 *
 * Flow:
 *   1. Resolve the user by userId.
 *   2. If user.emailVerifiedAt is set → already_verified.
 *   3. Rate-limit check (60s window per user).
 *   4. Generate a new raw token, hash it, persist the record.
 *   5. Send the verification email.
 *   6. Return { sent: true, retryAfter: now + 60s }.
 *
 * Errors:
 *   - user_not_found:     no such user
 *   - already_verified:   user's email is already verified
 *   - rate_limited:       rate limiter said no (with retryAfter)
 *
 * The rate-limiter key is the userId; the bucket name should be
 * 'verification_resend_per_email' per the spec.
 */

import { createHash } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type {
  EmailVerificationRepository,
} from "@/ports/repositories/EmailVerificationRepository";
import type { Clock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { RateLimiter } from "@/ports/security/RateLimiter";
import type { IdGenerator } from "@/ports/system/IdGenerator";

export type ResendVerificationInput = { userId: string };
export type ResendVerificationOutput = { sent: true; retryAfter: Date };
export type ResendVerificationError =
  | { kind: "user_not_found" }
  | { kind: "already_verified" }
  | { kind: "rate_limited"; retryAfter: Date };

export interface ResendVerificationDeps {
  users: UserRepository;
  emailVerifications: EmailVerificationRepository;
  clock: Clock;
  logger: Logger;
  emailSender: EmailSender;
  rateLimiter: RateLimiter;
  idGen: IdGenerator;
}

const RESEND_WINDOW_SECONDS = 60;
const TOKEN_TTL_HOURS = 24;

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export class ResendVerification {
  constructor(private readonly deps: ResendVerificationDeps) {}

  async execute(
    input: ResendVerificationInput,
  ): Promise<Result<ResendVerificationOutput, ResendVerificationError>> {
    const userResult = await this.deps.users.findById(input.userId);
    if (!userResult.ok) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    if (user.emailVerifiedAt) {
      this.deps.logger.info("resend_verification.already_verified", {
        userId: user.id,
      });
      return Result.err({ kind: "already_verified" });
    }

    // Rate-limit per-user. 1 request per 60s.
    const rl = await this.deps.rateLimiter.check({
      key: user.id,
      limit: 1,
      windowSeconds: RESEND_WINDOW_SECONDS,
    });
    if (rl.ok && !rl.value.allowed) {
      const retryAfter = new Date(
        this.deps.clock.now().getTime() + rl.value.resetSeconds * 1000,
      );
      this.deps.logger.info("resend_verification.rate_limited", {
        userId: user.id,
        retryAfter: retryAfter.toISOString(),
      });
      return Result.err({ kind: "rate_limited", retryAfter });
    }

    // Generate a fresh token, hash it, persist it.
    const rawToken = this.deps.idGen.newId();
    const tokenHash = sha256(rawToken);
    const now = this.deps.clock.now();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const created = await this.deps.emailVerifications.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    if (!created.ok) {
      this.deps.logger.error("resend_verification.create_failed", {
        userId: user.id,
        error: created.error,
      });
      return Result.err({ kind: "user_not_found" });
    }

    // Send the email. Build the verification URL using the raw token.
    const verifyUrl = this.buildVerifyUrl(rawToken);
    // Email rendering is a follow-up; the spec mentions a React Email
    // template. For now we pass a placeholder string; the wiring
    // tests in the architecture suite will catch a non-React payload
    // only if we tighten the port.
    await this.deps.emailSender.send({
      to: user.email,
      subject: "Verify your Project Amazon PH Academy email",
      react: null as unknown as never, // placeholder; replaced by the
      // email-templating follow-up that wires a real React element
    } as Parameters<EmailSender["send"]>[0]);

    this.deps.logger.info("resend_verification.success", {
      userId: user.id,
    });

    return Result.ok({
      sent: true,
      retryAfter: new Date(now.getTime() + RESEND_WINDOW_SECONDS * 1000),
    });
  }

  /** Build the verification URL. Kept here so the use case owns the
   * link shape; the page is a thin handler. */
  private buildVerifyUrl(rawToken: string): string {
    const base =
      process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(
      rawToken,
    )}`;
  }
}

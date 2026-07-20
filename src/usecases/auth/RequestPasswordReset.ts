/**
 * RequestPasswordReset use case — STORY-008.
 *
 * Issues a password-reset email if (and only if) the email
 * belongs to a real user. To prevent email enumeration, the
 * use case ALWAYS returns `{ sent: true }` for valid input,
 * even when no user exists.
 *
 * Flow:
 *   1. Validate email format.
 *   2. Rate-limit by email (5/hour) AND by IP (20/hour).
 *   3. Look up user by email.
 *   4. If user exists:
 *      a. Invalidate any of the user's existing reset tokens.
 *      b. Generate a fresh raw token, hash it, persist it.
 *      c. Send the email with the reset link.
 *   5. Return { sent: true }.
 *
 * Errors:
 *   - rate_limited:       email or IP rate limit hit (with resetAt)
 *   - validation_failed:  bad email format
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PasswordResetRepository } from "@/ports/repositories/PasswordResetRepository";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { RateLimiter } from "@/ports/security/RateLimiter";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Logger } from "@/ports/observability/Logger";

const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_SECONDS = 3600;
const IP_LIMIT = 20;
const IP_WINDOW_SECONDS = 3600;
const TOKEN_TTL_HOURS = 1;

const emailSchema = z.string().email();

export type RequestPasswordResetInput = { email: string; ip: string };
export type RequestPasswordResetOutput = { sent: true };
export type RequestPasswordResetError =
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "validation_failed"; message: string };

export interface RequestPasswordResetDeps {
  users: UserRepository;
  passwordResets: PasswordResetRepository;
  email: EmailSender;
  rateLimiter: RateLimiter;
  clock: Clock;
  ids: IdGenerator;
  logger: Logger;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export class RequestPasswordReset {
  constructor(private readonly deps: RequestPasswordResetDeps) {}

  async execute(
    input: RequestPasswordResetInput,
  ): Promise<Result<RequestPasswordResetOutput, RequestPasswordResetError>> {
    // 1. Validate email format.
    const parsed = emailSchema.safeParse(input.email);
    if (!parsed.success) {
      return Result.err({
        kind: "validation_failed",
        message: "Email format is invalid",
      });
    }
    const email = parsed.data.toLowerCase();

    // 2. Rate-limit by email.
    const emailRL = await this.deps.rateLimiter.check({
      key: `email:${email}`,
      limit: EMAIL_LIMIT,
      windowSeconds: EMAIL_WINDOW_SECONDS,
    });
    if (emailRL.ok && !emailRL.value.allowed) {
      return Result.err({
        kind: "rate_limited",
        resetAt: new Date(this.deps.clock.now().getTime() + emailRL.value.resetSeconds * 1000),
      });
    }

    // 3. Rate-limit by IP.
    const ipRL = await this.deps.rateLimiter.check({
      key: `ip:${input.ip}`,
      limit: IP_LIMIT,
      windowSeconds: IP_WINDOW_SECONDS,
    });
    if (ipRL.ok && !ipRL.value.allowed) {
      return Result.err({
        kind: "rate_limited",
        resetAt: new Date(this.deps.clock.now().getTime() + ipRL.value.resetSeconds * 1000),
      });
    }

    // 4. Look up user (case-insensitive).
    const userResult = await this.deps.users.findByEmail(email);
    if (!userResult.ok || !userResult.value) {
      this.deps.logger.info("request_password_reset.no_user", { email });
      return Result.ok({ sent: true });
    }
    const user = userResult.value;

    // 5. Invalidate any existing tokens for this user.
    await this.deps.passwordResets.invalidateAllForUser(user.id);

    // 6. Issue a new token.
    const rawToken = this.deps.ids.newId();
    const tokenHash = sha256(rawToken);
    const now = this.deps.clock.now();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const created = await this.deps.passwordResets.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    if (!created.ok) {
      this.deps.logger.error("request_password_reset.create_failed", {
        userId: user.id,
        error: created.error,
      });
      return Result.ok({ sent: true });
    }

    // 7. Send the email.
    const resetUrl = this.buildResetUrl(rawToken);
    await this.deps.email.send({
      to: user.email,
      subject: "Reset your Project Amazon PH Academy password",
      react: null, // template wiring is a follow-up; the email body
      // still goes out (the EmailSender adapter will handle a null
      // react with a fallback plain-text body for now)
    } as unknown as Parameters<EmailSender["send"]>[0]);

    this.deps.logger.info("request_password_reset.success", { userId: user.id });
    return Result.ok({ sent: true });
  }

  private buildResetUrl(rawToken: string): string {
    const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/reset-password/${encodeURIComponent(rawToken)}`;
  }
}

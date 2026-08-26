/**
 * RateLimiter port — STORY-054.
 *
 * Application-layer contract for rate limiting. Use cases and actions
 * depend on this interface, never on Upstash directly.
 *
 * Policy values are intentionally server-owned. Callers select a named
 * policy instead of supplying a limit/window that could drift or become
 * request-controlled.
 */

import { Result } from "@/domain/shared/Result";

export const RATE_LIMIT_POLICIES = {
  login_email: { limit: 5, windowSeconds: 900 },
  login_ip: { limit: 20, windowSeconds: 900 },
  signup_ip: { limit: 10, windowSeconds: 3600 },
  checkout_user: { limit: 10, windowSeconds: 3600 },
  password_reset_email: { limit: 5, windowSeconds: 3600 },
  password_reset_ip: { limit: 20, windowSeconds: 3600 },
  verification_resend_user: { limit: 1, windowSeconds: 60 },
  totp_user: { limit: 5, windowSeconds: 300 },
  totp_ip: { limit: 20, windowSeconds: 900 },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;

export interface RateLimitInput {
  key: string;
  policy: RateLimitPolicy;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export type RateLimitError =
  | { kind: "configuration_error"; message: string }
  | { kind: "rate_limiter_error"; message: string };

export interface RateLimiter {
  check(input: RateLimitInput): Promise<Result<RateLimitResult, RateLimitError>>;
}

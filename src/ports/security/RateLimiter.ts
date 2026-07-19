/**
 * RateLimiter port — STORY-054.
 *
 * Application-layer contract for rate limiting. Use cases and actions
 * depend on this interface, never on Upstash directly.
 */

import { Result } from "@/domain/shared/Result";

export interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
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

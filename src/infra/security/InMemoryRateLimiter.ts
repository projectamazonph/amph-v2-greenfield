/**
 * InMemoryRateLimiter — STORY-054.
 *
 * Test fake for the RateLimiter port. Uses a simple sliding-window
 * counter per policy and key. Safe for parallel tests because each
 * container gets its own instance.
 */

import { Result } from "@/domain/shared/Result";
import {
  RATE_LIMIT_POLICIES,
  type RateLimiter,
  type RateLimitInput,
  type RateLimitResult,
  type RateLimitError,
} from "@/ports/security/RateLimiter";

interface Bucket {
  requests: number[];
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly enforceLimits = true) {}

  async check(input: RateLimitInput): Promise<Result<RateLimitResult, RateLimitError>> {
    const policy = RATE_LIMIT_POLICIES[input.policy];
    if (!policy) {
      return Result.err({
        kind: "configuration_error",
        message: `Unknown rate-limit policy: ${input.policy}`,
      });
    }
    if (!input.key.trim()) {
      return Result.err({ kind: "configuration_error", message: "Rate-limit key is empty" });
    }

    if (!this.enforceLimits) {
      return Result.ok({
        allowed: true,
        remaining: policy.limit,
        resetSeconds: 0,
      });
    }

    const now = Date.now();
    const windowStart = now - policy.windowSeconds * 1000;
    const bucketKey = `${input.policy}:${input.key}`;
    const bucket = this.buckets.get(bucketKey) ?? { requests: [] };
    const recent = bucket.requests.filter((t) => t > windowStart);
    const allowed = recent.length < policy.limit;

    if (allowed) {
      recent.push(now);
    }

    this.buckets.set(bucketKey, { requests: recent });

    const oldest = recent[0] ?? now;
    const resetSeconds = Math.max(
      0,
      Math.ceil((oldest + policy.windowSeconds * 1000 - now) / 1000),
    );

    return Result.ok({
      allowed,
      remaining: Math.max(0, policy.limit - recent.length),
      resetSeconds,
    });
  }

  reset(): void {
    this.buckets.clear();
  }
}

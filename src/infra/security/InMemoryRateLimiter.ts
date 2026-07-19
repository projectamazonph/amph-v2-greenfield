/**
 * InMemoryRateLimiter — STORY-054.
 *
 * Test fake for the RateLimiter port. Uses a simple sliding-window
 * counter per key. Safe for parallel tests because each container
 * gets its own instance.
 */

import { Result } from "@/domain/shared/Result";
import type {
  RateLimiter,
  RateLimitInput,
  RateLimitResult,
  RateLimitError,
} from "@/ports/security/RateLimiter";

interface Bucket {
  requests: number[];
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  async check(input: RateLimitInput): Promise<Result<RateLimitResult, RateLimitError>> {
    const now = Date.now();
    const windowStart = now - input.windowSeconds * 1000;

    const bucket = this.buckets.get(input.key) ?? { requests: [] };
    const recent = bucket.requests.filter((t) => t > windowStart);
    const allowed = recent.length < input.limit;

    if (allowed) {
      recent.push(now);
    }

    this.buckets.set(input.key, { requests: recent });

    const oldest = recent[0] ?? now;
    const resetSeconds = Math.max(0, Math.ceil((oldest + input.windowSeconds * 1000 - now) / 1000));

    return Result.ok({
      allowed,
      remaining: Math.max(0, input.limit - recent.length),
      resetSeconds,
    });
  }

  reset(): void {
    this.buckets.clear();
  }
}

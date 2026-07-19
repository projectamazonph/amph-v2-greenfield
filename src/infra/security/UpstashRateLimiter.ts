/**
 * UpstashRateLimiter — STORY-054.
 *
 * Production adapter for the RateLimiter port. Lazy-initializes the
 * Upstash Redis client and ratelimit instance so builds don't require
 * Redis env vars.
 */

import { Result } from "@/domain/shared/Result";
import type {
  RateLimiter,
  RateLimitInput,
  RateLimitResult,
  RateLimitError,
} from "@/ports/security/RateLimiter";

type RatelimitInstance = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

export class UpstashRateLimiter implements RateLimiter {
  private instance: RatelimitInstance | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private getClient(): RatelimitInstance {
    if (this.instance) return this.instance;
    if (!this.url || !this.token) {
      // Return a permissive no-op when not configured.
      this.instance = {
        limit: async () => ({
          success: true,
          limit: 100,
          remaining: 100,
          reset: 0,
        }),
      };
      return this.instance;
    }

    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");

    const redis = new Redis({ url: this.url, token: this.token });
    this.instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
    }) as RatelimitInstance;
    return this.instance;
  }

  async check(input: RateLimitInput): Promise<Result<RateLimitResult, RateLimitError>> {
    try {
      const result = await this.getClient().limit(input.key);
      return Result.ok({
        allowed: result.success,
        remaining: result.remaining,
        resetSeconds: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
      });
    } catch (err) {
      return Result.err({
        kind: "rate_limiter_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

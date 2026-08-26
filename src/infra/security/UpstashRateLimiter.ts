/**
 * UpstashRateLimiter — STORY-054.
 *
 * Production adapter for the RateLimiter port. Lazy-initializes the
 * Upstash Redis client and one ratelimit instance per named policy.
 * Missing production credentials are an error, never a permissive no-op.
 */

import { Result } from "@/domain/shared/Result";
import {
  RATE_LIMIT_POLICIES,
  type RateLimiter,
  type RateLimitInput,
  type RateLimitPolicy,
  type RateLimitResult,
  type RateLimitError,
} from "@/ports/security/RateLimiter";

type UpstashRedis = InstanceType<typeof import("@upstash/redis").Redis>;

type RatelimitInstance = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

export class UpstashRateLimiter implements RateLimiter {
  private readonly instances = new Map<RateLimitPolicy, RatelimitInstance>();
  private redis: UpstashRedis | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private getClient(policyName: RateLimitPolicy): Result<RatelimitInstance, RateLimitError> {
    const cached = this.instances.get(policyName);
    if (cached) return Result.ok(cached);

    const policy = RATE_LIMIT_POLICIES[policyName];
    if (!policy) {
      return Result.err({
        kind: "configuration_error",
        message: `Unknown rate-limit policy: ${String(policyName)}`,
      });
    }
    if (!this.url || !this.token) {
      return Result.err({
        kind: "configuration_error",
        message: "Upstash rate limiter is not configured",
      });
    }

    try {
      const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
      const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");

      if (!this.redis) {
        this.redis = new Redis({ url: this.url, token: this.token });
      }

      const instance = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
        prefix: `amph:ratelimit:${policyName}`,
        analytics: true,
      }) as RatelimitInstance;
      this.instances.set(policyName, instance);
      return Result.ok(instance);
    } catch (err) {
      return Result.err({
        kind: "configuration_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async check(input: RateLimitInput): Promise<Result<RateLimitResult, RateLimitError>> {
    if (!input.key.trim()) {
      return Result.err({ kind: "configuration_error", message: "Rate-limit key is empty" });
    }

    const clientResult = this.getClient(input.policy);
    if (!clientResult.ok) return clientResult;

    try {
      const result = await clientResult.value.limit(input.key);
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

/**
 * UpstashRateLimiter tests — STORY-054.
 *
 * The SDK is mocked through CommonJS loading because the adapter defers SDK
 * loading until a configured limiter is actually used.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { UpstashRateLimiter } from "@/infra/security/UpstashRateLimiter";

type FakeResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

function installSdkMocks(options: {
  result?: FakeResult;
  throwOnLimit?: boolean;
  constructed?: Array<{ limit: number; window: string; prefix: string }>;
}) {
  const Module = require("node:module") as {
    _load: (request: string, parent: unknown) => unknown;
  };
  const originalLoad = Module._load;
  const constructed = options.constructed ?? [];

  class FakeRatelimit {
    constructor(config: { limiter: { limit: number; window: string }; prefix: string }) {
      constructed.push({
        limit: config.limiter.limit,
        window: config.limiter.window,
        prefix: config.prefix,
      });
    }

    static slidingWindow(limit: number, window: string) {
      return { limit, window };
    }

    async limit(): Promise<FakeResult> {
      if (options.throwOnLimit) throw new Error("Redis down");
      return (
        options.result ?? {
          success: true,
          limit: 5,
          remaining: 4,
          reset: Date.now() + 30_000,
        }
      );
    }
  }

  Module._load = function (request: string, parent: unknown) {
    if (request === "@upstash/redis") {
      return {
        Redis: class {
          constructor(_config: unknown) {}
        },
      };
    }
    if (request === "@upstash/ratelimit") return { Ratelimit: FakeRatelimit };
    return originalLoad.call(this, request, parent);
  };

  return {
    constructed,
    restore: () => {
      Module._load = originalLoad;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UpstashRateLimiter", () => {
  it("fails closed when URL and token are empty", async () => {
    const limiter = new UpstashRateLimiter("", "");
    const result = await limiter.check({ key: "user-1", policy: "login_email" });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "configuration_error",
        message: "Upstash rate limiter is not configured",
      },
    });
  });

  it("constructs the limiter from the selected server-owned policy", async () => {
    const sdk = installSdkMocks({ constructed: [] });
    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({ key: "user-1", policy: "login_email" });

      expect(result.ok).toBe(true);
      expect(sdk.constructed).toEqual([
        { limit: 5, window: "900 s", prefix: "amph:ratelimit:login_email" },
      ]);
    } finally {
      sdk.restore();
    }
  });

  it("caches per policy but does not share instances across policies", async () => {
    const sdk = installSdkMocks({ constructed: [] });
    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      await limiter.check({ key: "user-1", policy: "login_email" });
      await limiter.check({ key: "user-1", policy: "login_email" });
      await limiter.check({ key: "user-1", policy: "checkout_user" });

      expect(sdk.constructed).toEqual([
        { limit: 5, window: "900 s", prefix: "amph:ratelimit:login_email" },
        { limit: 10, window: "3600 s", prefix: "amph:ratelimit:checkout_user" },
      ]);
    } finally {
      sdk.restore();
    }
  });

  it("forwards an exceeded result", async () => {
    const sdk = installSdkMocks({
      result: {
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 30_000,
      },
    });
    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({ key: "user-1", policy: "login_email" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.allowed).toBe(false);
    } finally {
      sdk.restore();
    }
  });

  it("maps provider failures to rate_limiter_error", async () => {
    const sdk = installSdkMocks({ throwOnLimit: true });
    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({ key: "user-1", policy: "login_email" });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("rate_limiter_error");
    } finally {
      sdk.restore();
    }
  });
});

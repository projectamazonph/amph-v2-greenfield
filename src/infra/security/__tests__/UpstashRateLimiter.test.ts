/**
 * UpstashRateLimiter test — STORY-010.
 *
 * The class lazy-initializes the Upstash client. With empty URL/token
 * (the build-time default), it returns a permissive no-op. With a
 * configured client, the rate limit result is forwarded as-is.
 *
 * The actual @upstash/redis + @upstash/ratelimit SDK is mocked via
 * `require.cache` shimming because the adapter uses CommonJS
 * `require()` to defer the SDK load (so builds without env vars
 * don't crash).
 */

import { describe, it, expect, afterEach } from "vitest";
import { UpstashRateLimiter } from "@/infra/security/UpstashRateLimiter";

describe("UpstashRateLimiter", () => {
  // Reset require cache so each test can install its own mock.
  afterEach(() => {
    const cache = require.cache as Record<string, unknown>;
    for (const key of Object.keys(cache)) {
      if (key.includes("@upstash/")) {
        delete cache[key];
      }
    }
  });

  // ── no-op mode (no env configured) ──────────────────

  it("returns a permissive result when URL and token are empty", async () => {
    const limiter = new UpstashRateLimiter("", "");
    const result = await limiter.check({
      key: "user-1",
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
    expect(result.value.remaining).toBe(100);
  });

  // ── configured mode (SDK mocked) ─────────────────────

  it("forwards success=true from the Upstash client", async () => {
    // Install a fake @upstash/redis module.
    const cache = require.cache as Record<string, unknown>;
    cache["/fake/@upstash/redis"] = {
      id: "/fake/@upstash/redis",
      filename: "/fake/@upstash/redis.js",
      loaded: true,
      exports: {
        Redis: class {
          constructor(_opts: unknown) {}
        },
      },
    };
    cache["/fake/@upstash/ratelimit"] = {
      id: "/fake/@upstash/ratelimit",
      filename: "/fake/@upstash/ratelimit.js",
      loaded: true,
      exports: {
        Ratelimit: class {
          constructor(_opts: unknown) {}
          static slidingWindow(_limit: number, _window: string) {
            return { type: "sliding" };
          }
          async limit(key: string) {
            return {
              success: true,
              limit: 100,
              remaining: 99,
              reset: Date.now() + 30_000,
              _key: key,
            };
          }
        },
      },
    };

    // Patch the require to return our fakes
    const Module = require("node:module") as { _load: (req: string, parent: unknown) => unknown };
    const originalLoad = Module._load;
    Module._load = function (req: string, parent: unknown) {
      if (req === "@upstash/redis") return (cache["/fake/@upstash/redis"] as { exports: unknown }).exports;
      if (req === "@upstash/ratelimit") return (cache["/fake/@upstash/ratelimit"] as { exports: unknown }).exports;
      return originalLoad.call(this, req, parent);
    };

    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({
        key: "user-1",
        limit: 5,
        windowSeconds: 60,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.allowed).toBe(true);
      expect(result.value.remaining).toBe(99);
    } finally {
      Module._load = originalLoad;
    }
  });

  it("forwards success=false when the rate limit is exceeded", async () => {
    const cache = require.cache as Record<string, unknown>;
    cache["/fake/@upstash/redis"] = {
      id: "/fake/@upstash/redis",
      filename: "/fake/@upstash/redis.js",
      loaded: true,
      exports: {
        Redis: class {
          constructor(_opts: unknown) {}
        },
      },
    };
    cache["/fake/@upstash/ratelimit"] = {
      id: "/fake/@upstash/ratelimit",
      filename: "/fake/@upstash/ratelimit.js",
      loaded: true,
      exports: {
        Ratelimit: class {
          constructor(_opts: unknown) {}
          static slidingWindow() {
            return { type: "sliding" };
          }
          async limit() {
            return {
              success: false,
              limit: 100,
              remaining: 0,
              reset: Date.now() + 30_000,
            };
          }
        },
      },
    };

    const Module = require("node:module") as { _load: (req: string, parent: unknown) => unknown };
    const originalLoad = Module._load;
    Module._load = function (req: string, parent: unknown) {
      if (req === "@upstash/redis") return (cache["/fake/@upstash/redis"] as { exports: unknown }).exports;
      if (req === "@upstash/ratelimit") return (cache["/fake/@upstash/ratelimit"] as { exports: unknown }).exports;
      return originalLoad.call(this, req, parent);
    };

    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({
        key: "user-1",
        limit: 5,
        windowSeconds: 60,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.allowed).toBe(false);
      expect(result.value.remaining).toBe(0);
    } finally {
      Module._load = originalLoad;
    }
  });

  it("returns rate_limiter_error when the underlying client throws", async () => {
    const cache = require.cache as Record<string, unknown>;
    cache["/fake/@upstash/redis"] = {
      id: "/fake/@upstash/redis",
      filename: "/fake/@upstash/redis.js",
      loaded: true,
      exports: {
        Redis: class {
          constructor(_opts: unknown) {}
        },
      },
    };
    cache["/fake/@upstash/ratelimit"] = {
      id: "/fake/@upstash/ratelimit",
      filename: "/fake/@upstash/ratelimit.js",
      loaded: true,
      exports: {
        Ratelimit: class {
          constructor(_opts: unknown) {}
          static slidingWindow() {
            return { type: "sliding" };
          }
          async limit() {
            throw new Error("Redis down");
          }
        },
      },
    };

    const Module = require("node:module") as { _load: (req: string, parent: unknown) => unknown };
    const originalLoad = Module._load;
    Module._load = function (req: string, parent: unknown) {
      if (req === "@upstash/redis") return (cache["/fake/@upstash/redis"] as { exports: unknown }).exports;
      if (req === "@upstash/ratelimit") return (cache["/fake/@upstash/ratelimit"] as { exports: unknown }).exports;
      return originalLoad.call(this, req, parent);
    };

    try {
      const limiter = new UpstashRateLimiter("https://example.com", "token-abc");
      const result = await limiter.check({
        key: "user-1",
        limit: 5,
        windowSeconds: 60,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("rate_limiter_error");
    } finally {
      Module._load = originalLoad;
    }
  });
});

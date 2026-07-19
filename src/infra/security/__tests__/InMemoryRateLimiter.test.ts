/**
 * InMemoryRateLimiter tests — STORY-054.
 */

import { describe, it, expect } from "vitest";
import { InMemoryRateLimiter } from "../InMemoryRateLimiter";

describe("InMemoryRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = new InMemoryRateLimiter();
    const result = await limiter.check({ key: "ip:1", limit: 3, windowSeconds: 60 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
    expect(result.value.remaining).toBe(2);
  });

  it("blocks requests over the limit", async () => {
    const limiter = new InMemoryRateLimiter();
    const key = "ip:2";
    for (let i = 0; i < 3; i++) {
      await limiter.check({ key, limit: 2, windowSeconds: 60 });
    }
    const result = await limiter.check({ key, limit: 2, windowSeconds: 60 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(false);
    expect(result.value.remaining).toBe(0);
  });

  it("isolates keys", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check({ key: "a", limit: 1, windowSeconds: 60 });
    const result = await limiter.check({ key: "b", limit: 1, windowSeconds: 60 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
  });

  it("reset clears all buckets", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check({ key: "ip:3", limit: 1, windowSeconds: 60 });
    limiter.reset();
    const result = await limiter.check({ key: "ip:3", limit: 1, windowSeconds: 60 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
  });
});

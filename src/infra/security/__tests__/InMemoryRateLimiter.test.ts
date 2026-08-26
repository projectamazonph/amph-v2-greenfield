/**
 * InMemoryRateLimiter tests — STORY-054.
 */

import { describe, it, expect } from "vitest";
import { InMemoryRateLimiter } from "../InMemoryRateLimiter";

describe("InMemoryRateLimiter", () => {
  it("allows requests under the named policy limit", async () => {
    const limiter = new InMemoryRateLimiter();
    const result = await limiter.check({ key: "ip:1", policy: "login_ip" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
    expect(result.value.remaining).toBe(19);
  });

  it("blocks requests over the named policy limit", async () => {
    const limiter = new InMemoryRateLimiter();
    const key = "user:2";
    for (let i = 0; i < 10; i++) {
      await limiter.check({ key, policy: "checkout_user" });
    }
    const result = await limiter.check({ key, policy: "checkout_user" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(false);
    expect(result.value.remaining).toBe(0);
  });

  it("isolates keys and policies", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check({ key: "same", policy: "login_email" });
    const differentKey = await limiter.check({ key: "other", policy: "login_email" });
    const differentPolicy = await limiter.check({ key: "same", policy: "checkout_user" });
    expect(differentKey.ok && differentKey.value.allowed).toBe(true);
    expect(differentPolicy.ok && differentPolicy.value.allowed).toBe(true);
  });

  it("rejects an empty key", async () => {
    const limiter = new InMemoryRateLimiter();
    const result = await limiter.check({ key: "", policy: "login_ip" });
    expect(result).toEqual({
      ok: false,
      error: { kind: "configuration_error", message: "Rate-limit key is empty" },
    });
  });

  it("reset clears all buckets", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check({ key: "ip:3", policy: "verification_resend_user" });
    limiter.reset();
    const result = await limiter.check({ key: "ip:3", policy: "verification_resend_user" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.allowed).toBe(true);
  });
});

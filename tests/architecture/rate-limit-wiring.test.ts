/**
 * STORY-054 — Rate limiting wiring regression guards.
 */

import { describe, it, expect } from "vitest";
import { statSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function exists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("STORY-054 rate limiting wiring", () => {
  it("has a RateLimiter port", () => {
    expect(exists(join(SRC, "ports/security/RateLimiter.ts"))).toBe(true);
  });

  it("has an UpstashRateLimiter adapter", () => {
    expect(exists(join(SRC, "infra/security/UpstashRateLimiter.ts"))).toBe(true);
  });

  it("has an InMemoryRateLimiter fake", () => {
    expect(exists(join(SRC, "infra/security/InMemoryRateLimiter.ts"))).toBe(true);
  });

  it("exposes rateLimiter on the production container", () => {
    const body = readFileSync(join(SRC, "composition/container.ts"), "utf8");
    expect(body).toMatch(/rateLimiter:\s*RateLimiter/);
  });

  it("exposes rateLimiter on the test container", () => {
    const body = readFileSync(join(SRC, "composition/container.test.ts"), "utf8");
    expect(body).toMatch(/rateLimiter:\s*InMemoryRateLimiter/);
  });

  it("signup.action.ts calls rateLimiter.check()", () => {
    const body = readFileSync(join(SRC, "app/actions/signup.action.ts"), "utf8");
    expect(body).toMatch(/rateLimiter\.check\(/);
  });

  it("login.action.ts calls rateLimiter.check()", () => {
    const body = readFileSync(join(SRC, "app/actions/login.action.ts"), "utf8");
    expect(body).toMatch(/rateLimiter\.check\(/);
  });

  it("checkout.action.ts calls rateLimiter.check()", () => {
    const body = readFileSync(join(SRC, "app/actions/checkout.action.ts"), "utf8");
    expect(body).toMatch(/rateLimiter\.check\(/);
  });

  it("does NOT import @upstash/* outside infra/security", () => {
    const allowed = ["src/infra/security"];
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (allowed.some((a) => rel.startsWith(a))) continue;
      const body = readFileSync(file, "utf8");
      if (/from\s+["']@upstash\/[^"']+["']/.test(body)) {
        violations.push(relative(ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });
});

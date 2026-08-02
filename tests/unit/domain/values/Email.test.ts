import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createEmail, isValidEmail } from "@/domain/values/Email";

describe("createEmail", () => {
  it("accepts a well-formed email", () => {
    const result = createEmail("alice@example.com");
    expect(Result.isOk(result)).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("alice@example.com");
  });

  it("trims surrounding whitespace", () => {
    const result = createEmail("  alice@example.com  ");
    expect(result.ok && result.value).toBe("alice@example.com");
  });

  it("lowercases the result", () => {
    const result = createEmail("Alice@Example.COM");
    expect(result.ok && result.value).toBe("alice@example.com");
  });

  it("accepts a subdomain and a plus-tag", () => {
    const result = createEmail("alice+promo@mail.example.co.uk");
    expect(Result.isOk(result)).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = createEmail("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "empty" });
  });

  it("rejects a whitespace-only string", () => {
    const result = createEmail("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "empty" });
  });

  it("rejects a string with no @", () => {
    const result = createEmail("not-an-email.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_format" });
  });

  it("rejects a string with no domain dot", () => {
    const result = createEmail("alice@localhost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_format" });
  });

  it("rejects a string with a space", () => {
    const result = createEmail("alice smith@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_format" });
  });

  it("rejects multiple @ characters", () => {
    const result = createEmail("alice@@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_format" });
  });

  it("rejects a 1-character TLD", () => {
    const result = createEmail("alice@example.c");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_format" });
  });

  it("rejects an address over 254 characters total", () => {
    const longLocal = "a".repeat(64);
    const longDomain = "b".repeat(190) + ".com";
    const email = `${longLocal}@${longDomain}`;
    expect(email.length).toBeGreaterThan(254);
    const result = createEmail(email);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "too_long" });
  });

  it("rejects a local part over 64 characters", () => {
    const longLocal = "a".repeat(65);
    const email = `${longLocal}@example.com`;
    const result = createEmail(email);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "local_part_too_long" });
  });

  it("accepts a local part of exactly 64 characters", () => {
    const localPart = "a".repeat(64);
    const result = createEmail(`${localPart}@example.com`);
    expect(Result.isOk(result)).toBe(true);
  });

  it("does not hang on pathological input (ReDoS check)", () => {
    const pathological = "a".repeat(50000) + "!";
    const start = Date.now();
    createEmail(pathological);
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe("isValidEmail", () => {
  it("returns true for a valid email", () => {
    expect(isValidEmail("alice@example.com")).toBe(true);
  });

  it("returns false for an invalid email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

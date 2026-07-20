/**
 * Argon2PasswordHasher integration test — STORY-010.
 *
 * Real argon2 calls, no mocks. Argon2 is slow by design (memory-hard);
 * tests are conservative in count to keep CI under budget.
 */

import { describe, it, expect } from "vitest";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { Result } from "@/domain/shared/Result";

describe("Argon2PasswordHasher (integration)", () => {
  const hasher = new Argon2PasswordHasher();

  // ── hash + verify round-trip ──────────────────────────

  it("hashes a password and verifies it", async () => {
    const password = "Str0ngP@ssw0rd!";
    const hashResult = await hasher.hash(password);
    expect(hashResult.ok).toBe(true);
    if (!hashResult.ok) return;
    const hash = hashResult.value;
    expect(hash).toMatch(/^\$argon2id\$/);

    const verifyResult = await hasher.verify(password, hash);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) return;
    expect(verifyResult.value).toBe(true);
  }, 10_000);

  it("produces a different hash for the same input (salted)", async () => {
    const password = "same-password-1234";
    const a = await hasher.hash(password);
    const b = await hasher.hash(password);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value).not.toBe(b.value);
  }, 10_000);

  // ── wrong password ───────────────────────────────────

  it("rejects an incorrect password", async () => {
    const hash = await hasher.hash("correct-password-1234");
    expect(hash.ok).toBe(true);
    if (!hash.ok) return;
    const result = await hasher.verify("wrong-password-1234", hash.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  }, 10_000);

  it("rejects a password that is one character off", async () => {
    const hash = await hasher.hash("password-1234");
    expect(hash.ok).toBe(true);
    if (!hash.ok) return;
    const result = await hasher.verify("password-1235", hash.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  }, 10_000);

  // ── malformed hash ───────────────────────────────────

  it("returns false (not an error) for a malformed hash", async () => {
    // A non-Argon2 hash string — argon2.verify throws, we catch
    // it and return ok(false) so the caller treats it as a
    // non-match instead of a DB / library failure.
    const result = await hasher.verify("any-password", "not-a-real-hash");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  });

  it("returns false for empty password with valid hash (defensive)", async () => {
    const hash = await hasher.hash("real-password-1234");
    expect(hash.ok).toBe(true);
    if (!hash.ok) return;
    const result = await hasher.verify("", hash.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  });

  it("returns false for valid password with empty hash (defensive)", async () => {
    const result = await hasher.verify("any-password", "");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  });

  // ── empty password on hash ───────────────────────────

  it("rejects an empty password at hash time", async () => {
    const result = await hasher.hash("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "hash_error" });
  });
});

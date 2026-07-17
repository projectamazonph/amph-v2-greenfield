/**
 * PasswordHasher tests — TDD.
 *
 * Story 006: The SignUp use case currently stubs password hashing.
 * This port replaces that stub with a real Argon2 implementation.
 *
 * KISS: Only two methods — hash() and verify().
 * YAGNI: We don't need bcrypt vs argon2 comparison logic here.
 * SRP: One reason to change — if the hashing algorithm needs upgrading.
 * Fail Fast: Reject empty passwords at the port boundary.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/lib/Result";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";

type PasswordHasher = {
  hash(password: string): Promise<Result<string, { kind: "hash_error" }>>;
  verify(password: string, hash: string): Promise<Result<boolean, { kind: "verify_error" }>>;
};

// ── Tests ───────────────────────────────────────────────────

describe("PasswordHasher", () => {
  let hasher: PasswordHasher;

  beforeEach(() => {
    hasher = new Argon2PasswordHasher();
  });

  describe("hash()", () => {
    it("returns an ok result with a hash string", async () => {
      const result = await hasher.hash("Str0ngP@ss!");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value).toBe("string");
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it("returns different hashes for the same password (salted)", async () => {
      const [r1, r2] = await Promise.all([
        hasher.hash("Str0ngP@ss!"),
        hasher.hash("Str0ngP@ss!"),
      ]);
      if (r1.ok && r2.ok) {
        expect(r1.value).not.toBe(r2.value);
      }
    });

    it("hash is not the plaintext password", async () => {
      const result = await hasher.hash("Str0ngP@ss!");
      if (result.ok) {
        expect(result.value).not.toBe("Str0ngP@ss!");
        expect(result.value).not.toContain("Str0ngP@ss");
      }
    });
  });

  describe("verify()", () => {
    it("returns ok with true for correct password", async () => {
      const hash = (await hasher.hash("Str0ngP@ss!")) as { ok: true; value: string };
      const result = await hasher.verify("Str0ngP@ss!", hash.value);
      expect(Result.isOk(result) && result.value).toBe(true);
    });

    it("returns ok with false for wrong password", async () => {
      const hash = (await hasher.hash("Str0ngP@ss!")) as { ok: true; value: string };
      const result = await hasher.verify("WrongPassword!", hash.value);
      expect(Result.isOk(result) && result.value).toBe(false);
    });

    it("returns ok with false for empty password", async () => {
      const hash = (await hasher.hash("Str0ngP@ss!")) as { ok: true; value: string };
      const result = await hasher.verify("", hash.value);
      expect(Result.isOk(result) && result.value).toBe(false);
    });
  });

  describe("integration: hash then verify round-trip", () => {
    it("a hashed password verifies correctly", async () => {
      const password = "Str0ngP@ss!";
      const hashResult = await hasher.hash(password);
      if (!hashResult.ok) throw new Error("hash failed");

      const verifyResult = await hasher.verify(password, hashResult.value);
      expect(Result.isOk(verifyResult) && verifyResult.value).toBe(true);
    });
  });
});

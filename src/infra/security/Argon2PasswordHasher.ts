/**
 * Argon2 password hasher — Story 006.
 *
 * Uses argon2 (the winners of the Password Hashing Competition, 2015).
 * Default params: Argon2id, 64MB memory, 3 iterations — safe against ASIC/GPU.
 *
 * KISS: Delegated entirely to the argon2 library.
 * SRP: One reason to change — upgrading the algorithm.
 * Fail Fast: Empty passwords are rejected before touching the hasher.
 */

import { createRequire } from "node:module";
import { Result } from "@/lib/Result";
import type { PasswordHasher, HashError, VerifyError } from "@/ports/security/PasswordHasher";

const require = createRequire(import.meta.url);
const argon2 = require("argon2") as typeof import("argon2");

export type { HashError, VerifyError };

export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Hash a password with Argon2id.
   * Defaults: m=65536 (64MB), t=3, p=1.
   * The encoded hash string (e.g. `$argon2id$...`) doubles as the stored value.
   */
  async hash(password: string): Promise<Result<string, HashError>> {
    if (!password) {
      // Fail Fast — never hash an empty string
      return Result.err({ kind: "hash_error" });
    }
    try {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65_536, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });
      return Result.ok(hash);
    } catch {
      return Result.err({ kind: "hash_error" });
    }
  }

  /**
   * Verify a password against a stored Argon2 hash.
   * Returns true only on a perfect match.
   * Timing-safe comparison is handled by argon2.verify().
   */
  async verify(
    password: string,
    hash: string,
  ): Promise<Result<boolean, VerifyError>> {
    if (!password || !hash) {
      // Fail Fast — empty inputs cannot match anything
      return Result.ok(false);
    }
    try {
      const ok = await argon2.verify(hash, password);
      return Result.ok(ok);
    } catch {
      // Corrupt hash or argon2 error → reject
      return Result.ok(false);
    }
  }
}

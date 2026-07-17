/**
 * PasswordHasher port — Story 006.
 *
 * The domain and use-case layers must not know about Argon2, bcrypt, or any
 * specific hashing algorithm. They depend on this interface instead.
 *
 * ADR-014: Every port method returns Result. Never throws across layer boundaries.
 */

import { Result } from "@/lib/Result";

export type HashError = { kind: "hash_error" };
export type VerifyError = { kind: "verify_error" };

export interface PasswordHasher {
  /**
   * Hash a plaintext password.
   * Returns the encoded hash string (e.g. `$argon2id$...`).
   */
  hash(password: string): Promise<Result<string, HashError>>;

  /**
   * Verify a plaintext password against a stored hash.
   * Returns true only on a perfect match.
   */
  verify(password: string, hash: string): Promise<Result<boolean, VerifyError>>;
}

/**
 * JwtService port — Story 013.
 *
 * Signs and verifies HS256 JSON Web Tokens.
 * Used by the auth flow to embed session data in the cookie payload.
 *
 * ADR-014: Every port method returns Result. Never throw.
 */

import { Result } from "@/domain/shared/Result";

export interface JwtService {
  /**
   * Sign a payload into a JWS compact-serialized token.
   * @param payload  Claims to embed. Must include `sub` (user ID) at minimum.
   * @param expiresIn  jose-compatible duration string, e.g. "7d", "1h", "3600s".
   */
  sign(payload: Record<string, unknown>, expiresIn: string): Promise<Result<string, Error>>;

  /**
   * Verify and decode a JWS compact token.
   * @param token  The raw token string from the cookie.
   * @returns Result.ok with the decoded payload if valid, or Result.err on failure.
   */
  verify(token: string): Promise<Result<Record<string, unknown>, Error>>;
}

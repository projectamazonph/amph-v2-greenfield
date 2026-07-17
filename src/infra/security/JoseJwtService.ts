/**
 * JoseJwtService — Story 013.
 *
 * JwtService adapter using the `jose` library (Web Crypto API, Edge-compatible).
 * HS256, no native binary dependencies.
 */

import { SignJWT, jwtVerify } from "jose";
import type { JwtService } from "@/ports/security/JwtService";
import { Result } from "@/domain/shared/Result";

export class JoseJwtService implements JwtService {
  constructor(private readonly secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters.");
    }
  }

  async sign(payload: Record<string, unknown>, expiresIn: string): Promise<Result<string, Error>> {
    try {
      const secret = new TextEncoder().encode(this.secret);
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secret);
      return Result.ok(token);
    } catch (e) {
      return Result.err(e as Error);
    }
  }

  async verify(token: string): Promise<Result<Record<string, unknown>, Error>> {
    try {
      const secret = new TextEncoder().encode(this.secret);
      const { payload } = await jwtVerify(token, secret);
      return Result.ok(payload as Record<string, unknown>);
    } catch (e) {
      return Result.err(e as Error);
    }
  }
}

/**
 * OtpauthTotpService — production adapter for TotpService, backed by
 * the `otpauth` library (RFC 6238 TOTP).
 */

import { TOTP, Secret } from "otpauth";
import type { TotpKeyUriParams, TotpService } from "@/ports/security/TotpService";

const ALGORITHM = "SHA1"; // matches every mainstream authenticator app's default
const DIGITS = 6;
const PERIOD = 30;

export class OtpauthTotpService implements TotpService {
  generateSecret(): string {
    return new Secret({ size: 20 }).base32;
  }

  keyUri({ secret, accountName, issuer }: TotpKeyUriParams): string {
    const totp = new TOTP({
      issuer,
      label: accountName,
      secret: Secret.fromBase32(secret),
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
    });
    return totp.toString();
  }

  verify(secret: string, token: string): boolean {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
    });
    // validate() returns the matched window's delta (0, 1, or -1) on
    // success, or null on failure — window: 1 allows ±30s clock skew.
    return totp.validate({ token, window: 1 }) !== null;
  }
}

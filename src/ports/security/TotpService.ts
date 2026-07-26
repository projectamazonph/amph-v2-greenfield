/**
 * TotpService — port for TOTP (RFC 6238) secret generation and
 * verification, used by admin two-factor authentication.
 *
 * Not wrapped in Result: these are pure/local operations (no IO), same
 * treatment as PasswordHasher's synchronous-shaped methods elsewhere in
 * this codebase — a TOTP library has no failure mode worth modeling as
 * a Result (an invalid code is a normal "false", not an error).
 */

export interface TotpKeyUriParams {
  /** Base32-encoded secret, as returned by generateSecret(). */
  secret: string;
  /** Shown in the authenticator app as the account label — use the user's email. */
  accountName: string;
  /** Shown in the authenticator app as the issuer/service name. */
  issuer: string;
}

export interface TotpService {
  /** Generate a new random base32-encoded TOTP secret. */
  generateSecret(): string;

  /**
   * otpauth:// provisioning URI for a QR code / manual entry in an
   * authenticator app (Google Authenticator, 1Password, etc.).
   */
  keyUri(params: TotpKeyUriParams): string;

  /**
   * Verify a 6-digit code against the secret. Allows one time-step of
   * clock skew in either direction (±30s), matching every mainstream
   * authenticator app's own tolerance.
   */
  verify(secret: string, token: string): boolean;
}

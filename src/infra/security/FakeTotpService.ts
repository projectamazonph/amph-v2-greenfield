/**
 * FakeTotpService — deterministic test double for TotpService.
 *
 * `verify()` accepts exactly one fixed code (default "123456") rather
 * than computing a real TOTP window, so tests don't need to deal with
 * real-time-based codes.
 */

import type { TotpKeyUriParams, TotpService } from "@/ports/security/TotpService";

export class FakeTotpService implements TotpService {
  constructor(private readonly correctCode: string = "123456") {}

  generateSecret(): string {
    return "FAKEBASE32SECRETFORTESTS";
  }

  keyUri({ secret, accountName, issuer }: TotpKeyUriParams): string {
    return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
  }

  verify(_secret: string, token: string): boolean {
    return token === this.correctCode;
  }
}

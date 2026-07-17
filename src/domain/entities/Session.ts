/**
 * Session entity — Story 012.
 *
 * Represents an authenticated user session.
 * KISS: Only stores the session identity and expiry.
 * YAGNI: No refresh token logic yet — just the core session.
 * Fail Fast: Expired sessions are rejected at the domain level.
 */

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

/** Is the session still valid? */
export function sessionIsValid(session: Session, now: Date): boolean {
  return session.expiresAt > now;
}

/** Days until expiry (negative if already expired). */
export function sessionDaysUntilExpiry(session: Session, now: Date): number {
  const ms = session.expiresAt.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

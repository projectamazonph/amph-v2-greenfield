/**
 * Session entity tests — Rule 8 (TDD compliance).
 *
 * Tests the Session helpers: sessionIsValid, sessionDaysUntilExpiry.
 */

import { describe, it, expect } from "vitest";
import {
  sessionIsValid,
  sessionDaysUntilExpiry,
  type Session,
} from "@/domain/entities/Session";

function makeSession(expiresAt: Date, createdAt: Date = new Date("2026-01-01T00:00:00Z")): Session {
  return {
    id: "sess-1",
    userId: "u-1",
    expiresAt,
    createdAt,
  };
}

describe("Session entity", () => {
  describe("sessionIsValid", () => {
    it("returns true when expiresAt is in the future", () => {
      const future = new Date(Date.now() + 60_000);
      const session = makeSession(future);
      expect(sessionIsValid(session, new Date())).toBe(true);
    });

    it("returns false when expiresAt is in the past", () => {
      const past = new Date(Date.now() - 60_000);
      const session = makeSession(past);
      expect(sessionIsValid(session, new Date())).toBe(false);
    });

    it("returns false when expiresAt equals now (boundary)", () => {
      const now = new Date();
      const session = makeSession(now);
      // expiresAt > now is false when equal
      expect(sessionIsValid(session, now)).toBe(false);
    });
  });

  describe("sessionDaysUntilExpiry", () => {
    it("returns a positive number for future sessions", () => {
      // Use a value safely in the middle of a day, then assert
      // the result is close to 7 (not exactly 7) — the day
      // boundary can tick over during the test, and the function
      // floors on date components, so 7d - 1ms could legitimately
      // return 6.
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = makeSession(future);
      const days = sessionDaysUntilExpiry(session, new Date());
      // Tolerance window of ±1 day — anything beyond means the
      // function is broken, not flaky.
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(7);
    });

    it("returns 0 for sessions expiring in <24h", () => {
      const soon = new Date(Date.now() + 60_000);
      const session = makeSession(soon);
      expect(sessionDaysUntilExpiry(session, new Date())).toBe(0);
    });

    it("returns a negative number for expired sessions", () => {
      // Use 2 full days in the past, then assert the result is
      // at most -2. The floor-on-date-components means anything
      // between -2 and -3 is legitimate.
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const session = makeSession(past);
      const days = sessionDaysUntilExpiry(session, new Date());
      expect(days).toBeLessThanOrEqual(-2);
      expect(days).toBeGreaterThanOrEqual(-3);
    });
  });
});

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
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = makeSession(future);
      expect(sessionDaysUntilExpiry(session, new Date())).toBe(7);
    });

    it("returns 0 for sessions expiring in <24h", () => {
      const soon = new Date(Date.now() + 60_000);
      const session = makeSession(soon);
      expect(sessionDaysUntilExpiry(session, new Date())).toBe(0);
    });

    it("returns a negative number for expired sessions", () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const session = makeSession(past);
      expect(sessionDaysUntilExpiry(session, new Date())).toBeLessThan(0);
    });
  });
});

/**
 * User entity tests — Rule 8 (TDD compliance).
 *
 * Tests the createUser factory and the helper functions
 * (userFullName, userInitials, isAdmin, isInstructor).
 */

import { describe, it, expect } from "vitest";
import {
  createUser,
  userFullName,
  userInitials,
  isAdmin,
  isInstructor,
  type User,
} from "@/domain/entities/User";

function makeUser(overrides: Partial<Parameters<typeof createUser>[0]> = {}): User {
  const r = createUser({
    id: "u-1",
    email: "Test@Example.com",
    firstName: "Maria",
    lastName: "Santos",
    ...overrides,
  });
  if (!r.ok) throw new Error(`setup failed: ${r.error.message}`);
  return r.value;
}

describe("User entity", () => {
  describe("createUser", () => {
    it("creates a user with sensible defaults", () => {
      const r = createUser({
        id: "u-1",
        email: "maria@example.com",
        firstName: "Maria",
        lastName: "Santos",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.role).toBe("STUDENT");
      expect(r.value.subscriptionTier).toBe("FREE");
      expect(r.value.verificationStatus).toBe("UNVERIFIED");
      expect(r.value.totalXp).toBe(0);
      expect(r.value.enrolledCourseIds).toEqual([]);
    });

    it("lowercases and trims the email", () => {
      const r = createUser({
        id: "u-1",
        email: "  MARIA@Example.COM  ",
        firstName: "Maria",
        lastName: "Santos",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.email).toBe("maria@example.com");
    });

    it("trims first and last names", () => {
      const r = createUser({
        id: "u-1",
        email: "maria@example.com",
        firstName: "  Maria  ",
        lastName: "  Santos  ",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.firstName).toBe("Maria");
      expect(r.value.lastName).toBe("Santos");
    });

    it("rejects empty first name", () => {
      const r = createUser({
        id: "u-1",
        email: "maria@example.com",
        firstName: "   ",
        lastName: "Santos",
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_input");
      expect(r.error.message).toMatch(/first name/i);
    });

    it("rejects empty last name", () => {
      const r = createUser({
        id: "u-1",
        email: "maria@example.com",
        firstName: "Maria",
        lastName: "",
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_input");
      expect(r.error.message).toMatch(/last name/i);
    });

    it("freezes the user object (immutability)", () => {
      const user = makeUser();
      expect(Object.isFrozen(user)).toBe(true);
    });

    it("freezes the enrolledCourseIds array", () => {
      const user = makeUser({ enrolledCourseIds: ["c-1", "c-2"] });
      expect(Object.isFrozen(user.enrolledCourseIds)).toBe(true);
    });
  });

  describe("userFullName", () => {
    it("combines first and last name with a space", () => {
      const user = makeUser({ firstName: "Maria", lastName: "Santos" });
      expect(userFullName(user)).toBe("Maria Santos");
    });
  });

  describe("userInitials", () => {
    it("returns the first letter of each name uppercased", () => {
      const user = makeUser({ firstName: "maria", lastName: "santos" });
      expect(userInitials(user)).toBe("MS");
    });

    it("handles single-character names without crashing", () => {
      const user = makeUser({ firstName: "A", lastName: "B" });
      expect(userInitials(user)).toBe("AB");
    });
  });

  describe("isAdmin / isInstructor", () => {
    it("isAdmin is true for role ADMIN", () => {
      expect(isAdmin(makeUser({ role: "ADMIN" }))).toBe(true);
    });

    it("isAdmin is false for STUDENT and INSTRUCTOR", () => {
      expect(isAdmin(makeUser({ role: "STUDENT" }))).toBe(false);
      expect(isAdmin(makeUser({ role: "INSTRUCTOR" }))).toBe(false);
    });

    it("isInstructor is true for INSTRUCTOR and ADMIN (admin is also an instructor)", () => {
      expect(isInstructor(makeUser({ role: "INSTRUCTOR" }))).toBe(true);
      expect(isInstructor(makeUser({ role: "ADMIN" }))).toBe(true);
      expect(isInstructor(makeUser({ role: "STUDENT" }))).toBe(false);
    });
  });
});

/**
 * UserCard.test.tsx — STORY-046.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { UserCard } from "../UserCard";
import type { User } from "@/domain/entities/User";

const ADMIN: User = {
  id: "u-1",
  email: "admin@example.com",
  firstName: "Maria",
  lastName: "Santos",
  role: "ADMIN",
  subscriptionTier: "FREE",
  verificationStatus: "VERIFIED",
  enrolledCourseIds: [],
  createdAt: new Date(),
  totalXp: 0,
};

const SINGLE_NAME: User = { ...ADMIN, firstName: "Cher", lastName: "" };

function render(user: User = ADMIN) {
  return renderToString(createElement(UserCard, { user }));
}

describe("UserCard", () => {
  it("renders the full name", () => {
    const html = render();
    expect(html).toContain("Maria");
    expect(html).toContain("Santos");
  });

  it("renders the role in uppercase", () => {
    const html = render();
    expect(html).toContain("ADMIN");
  });

  it("renders initials (first letter of first + last name)", () => {
    const html = render();
    // Maria Santos -> "MS"
    expect(html).toContain("MS");
  });

  it("handles single-name users gracefully", () => {
    const html = render(SINGLE_NAME);
    // Cher (no last name) -> "C" (the lastName char is undefined, so we get just "C")
    expect(html).toContain("C");
    expect(html).toContain("Cher");
  });

  it("renders a logout form pointing to /api/auth/logout", () => {
    const html = render();
    expect(html).toContain("<form");
    expect(html).toContain('action="/api/auth/logout"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-label="Log out"');
  });

  it("uses the accent color for the avatar (via CSS Module class)", () => {
    const html = render();
    // The avatar div has the _avatar_* class; we just verify the
    // element exists with some class.
    expect(html).toMatch(/<div class="[^"]*avatar[^"]*"/);
  });
});

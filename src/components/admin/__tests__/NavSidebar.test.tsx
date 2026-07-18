/**
 * NavSidebar.test.tsx — STORY-046.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { NavSidebar } from "../NavSidebar";
import type { User } from "@/domain/entities/User";

const TEST_USER: User = {
  id: "u-1",
  email: "admin@example.com",
  firstName: "Admin",
  lastName: "User",
  role: "ADMIN",
  subscriptionTier: "FREE",
  verificationStatus: "VERIFIED",
  enrolledCourseIds: [],
  createdAt: new Date(),
  totalXp: 0,
};

function render(props: { currentPath?: string } = {}) {
  return renderToString(
    createElement(NavSidebar, { user: TEST_USER, ...props }),
  );
}

function hasActiveClass(html: string, href: string): boolean {
  // Find the <a ...> tag and check if it has a class containing 'active'.
  // The href may appear before or after the class in the rendered HTML.
  const pattern = new RegExp(
    `<a[^>]*?href="${href.replace(/[/]/g, "\\/")}"[^>]*>`,
  );
  const m = html.match(pattern);
  if (!m || !m[0]) return false;
  const clsMatch = m[0].match(/class="([^"]+)"/);
  if (!clsMatch || !clsMatch[1]) return false;
  return clsMatch[1].split(/\s+/).some((c) => c.includes("active"));
}

describe("NavSidebar", () => {
  it("renders the brand + Admin badge", () => {
    const html = render();
    expect(html).toContain("AMPH Academy");
    expect(html).toContain("Admin");
  });

  it("renders all 10 nav items", () => {
    const html = render();
    expect(html).toContain("Dashboard");
    expect(html).toContain("Users");
    expect(html).toContain("Courses");
    expect(html).toContain("Content");
    expect(html).toContain("Payments");
    expect(html).toContain("Refunds");
    expect(html).toContain("Live Classes");
    expect(html).toContain("Simulators");
    expect(html).toContain("Badges");
    expect(html).toContain("Settings");
  });

  it("renders an <aside> with admin navigation label", () => {
    const html = render();
    expect(html).toContain("<aside");
    expect(html).toContain('aria-label="Admin navigation"');
  });

  it("marks the /admin link as active when currentPath is /admin", () => {
    const html = render({ currentPath: "/admin" });
    expect(hasActiveClass(html, "/admin")).toBe(true);
  });

  it("marks the /admin/users link as active when currentPath is /admin/users", () => {
    const html = render({ currentPath: "/admin/users" });
    expect(hasActiveClass(html, "/admin/users")).toBe(true);
    // /admin should NOT be active
    expect(hasActiveClass(html, "/admin")).toBe(false);
  });

  it("marks the /admin/users link as active for sub-routes too", () => {
    const html = render({ currentPath: "/admin/users/abc-123" });
    expect(hasActiveClass(html, "/admin/users")).toBe(true);
  });

  it("does not mark any link as active when currentPath is not provided", () => {
    const html = render();
    // No link should have the "active" class. We test that no href has
    // a className containing "active".
    const linkClasses = Array.from(
      html.matchAll(/<a[^>]*class="([^"]+)"/g),
    ).map((m) => m[1]);
    expect(linkClasses.length).toBeGreaterThan(0);
    for (const cls of linkClasses) {
      expect(cls).not.toContain("active");
    }
  });

  it("renders the user card with the admin's initials", () => {
    const html = render();
    expect(html).toContain("Admin");
    expect(html).toContain("User");
    // Initials for "Admin User" are "AU"
    expect(html).toContain("AU");
  });

  it("renders a logout form", () => {
    const html = render();
    expect(html).toContain("<form");
    expect(html).toContain('action="/api/auth/logout"');
    expect(html).toContain('type="submit"');
  });
});

/**
 * NavSidebar.test.tsx — STORY-046.
 *
 * The component is a client component that reads the live path via
 * `usePathname()` from next/navigation. Tests mock that hook to
 * control the current path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";

let currentPath = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

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
  twoFactorEnabled: false,
  createdAt: new Date(),
  totalXp: 0,
  emailVerifiedAt: null,
};

function render() {
  return renderToString(createElement(NavSidebar, { user: TEST_USER }));
}

function hasDataActive(html: string, href: string): boolean {
  // Find each <a>...</a> and check whether it has both `href="<X>"` and
  // `data-active="true"`. Attribute order is not stable in React 19 SSR
  // (data-* often comes before href), so we can't rely on the JSX order.
  const anchorPattern = /<a\b([^>]*)>/g;
  const escHref = href.replace(/[/\\^$.*+?()[\]{}|]/g, "\\$&");
  const hrefRe = new RegExp(`href="${escHref}"`);
  const activeRe = /data-active="true"/;
  let m: RegExpExecArray | null;
  while ((m = anchorPattern.exec(html)) !== null) {
    const attrs = m[1] ?? "";
    if (hrefRe.test(attrs) && activeRe.test(attrs)) {
      return true;
    }
  }
  return false;
}

function hasAnyDataActive(html: string): boolean {
  return /<a\b[^>]*data-active="true"[^>]*>/.test(html);
}

describe("NavSidebar", () => {
  beforeEach(() => {
    currentPath = "/admin";
  });

  it("renders the brand + Admin badge", () => {
    const html = render();
    expect(html).toContain("Project Amazon PH Academy");
    expect(html).toContain("Admin");
  });

  it("renders all 12 nav items", () => {
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
    expect(html).toContain("Quizzes");
    expect(html).toContain("Certificates");
    expect(html).toContain("Settings");
  });

  it("renders an <aside> with admin navigation label", () => {
    const html = render();
    expect(html).toContain("<aside");
    expect(html).toContain('aria-label="Admin navigation"');
  });

  it("marks the /admin link as active when the current path is /admin", () => {
    currentPath = "/admin";
    const html = render();
    expect(hasDataActive(html, "/admin")).toBe(true);
  });

  it("marks the /admin/users link as active when the current path is /admin/users", () => {
    currentPath = "/admin/users";
    const html = render();
    expect(hasDataActive(html, "/admin/users")).toBe(true);
    // /admin should NOT be active
    expect(hasDataActive(html, "/admin")).toBe(false);
  });

  it("marks the /admin/users link as active for sub-routes too", () => {
    currentPath = "/admin/users/abc-123";
    const html = render();
    expect(hasDataActive(html, "/admin/users")).toBe(true);
  });

  it("does not mark any link as active when the current path is / (no admin route)", () => {
    currentPath = "/";
    const html = render();
    // No <a> should have data-active="true"
    expect(hasAnyDataActive(html)).toBe(false);
  });

  it("renders the user card with the admin's initials", () => {
    const html = render();
    expect(html).toContain("Admin");
    expect(html).toContain("User");
    // Initials for "Admin User" are "AU"
    expect(html).toContain("AU");
  });
});

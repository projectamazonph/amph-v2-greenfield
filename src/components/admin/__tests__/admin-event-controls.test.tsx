import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getSessionUser: vi.fn(),
  getAdminSessionCookieName: vi.fn(() => "amph_admin_session"),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  getAdminSessionCookieName: mocks.getAdminSessionCookieName,
}));

import { ConfirmSubmitButton } from "../ConfirmSubmitButton";
import { ImpersonationBanner } from "../ImpersonationBanner";

describe("admin event controls", () => {
  it("renders a submit control for server-action forms with an accessible Dialog", () => {
    const markup = renderToString(
      <ConfirmSubmitButton confirmMessage="Archive this course?" className="danger">
        Archive
      </ConfirmSubmitButton>,
    );
    expect(markup).toContain('type="submit"');
    expect(markup).toContain("Archive");

    const source = readFileSync(new URL("../ConfirmSubmitButton.tsx", import.meta.url), "utf8");
    // Uses Astryx Dialog component (not native window.confirm)
    expect(source).toContain("from \"@astryxdesign/core/Dialog\"");
    expect(source).toContain('purpose="required"');
    // Uses programmatic form submission after confirmation
    expect(source).toContain("requestSubmit");
  });

  describe("ImpersonationBanner", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("stays hidden without the admin backup cookie", async () => {
      mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
      expect(await ImpersonationBanner()).toBeNull();
      expect(mocks.getSessionUser).not.toHaveBeenCalled();
    });

    it("renders the stop-impersonating form for an active impersonation", async () => {
      mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "admin-token" })) });
      mocks.getSessionUser.mockResolvedValue({ email: "student@example.com", firstName: "Student", lastName: "User" });
      const element = await ImpersonationBanner();
      expect(element).not.toBeNull();
      expect(element?.props.role).toBe("status");
      expect(element?.props.children.props.children[1].props.children).toContain("student@example.com");
      expect(element?.props.children.props.children[2].props.children.props.children).toBe("Stop impersonating");
      expect(typeof element?.props.children.props.children[2].props.action).toBe("function");
    });
  });
});

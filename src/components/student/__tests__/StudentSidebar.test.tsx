// @vitest-environment jsdom

/**
 * StudentSidebar — new-user "?" badge tests (STORY-129).
 *
 * The badge appears next to the Dashboard link when:
 *   - welcomeCompletedAt === null, AND
 *   - now - createdAt < 7 days
 *
 * The badge is a `<button>` (not a `<Link>`) so it doesn't nest an `<a>`
 * inside the outer Dashboard `<Link>` — invalid HTML5. Click handlers use
 * `router.push("/welcome")`. Pinning these three cases keeps the freshness
 * window honest and stops the badge from leaking to established users.
 *
 * SSR-safety: the badge is gated by `useEffect` so initial SSR markup
 * matches the first client render; the test uses `waitFor` to wait for
 * the post-mount effect to flip the flag.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.unmock("@/components/student/StudentSidebar");

import { StudentSidebar } from "../StudentSidebar";

const mockUsePathname = vi.fn();
const mockUseRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockUseRouterPush }),
}));

describe("StudentSidebar new-user badge", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseRouterPush.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a ? badge next to Dashboard for a fresh user (under 7 days, welcome not yet completed)", async () => {
    // createdAt = 1 hour ago → safely under the 7-day window
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: null,
          createdAt: oneHourAgo,
        }}
      />,
    );

    const badge = await waitFor(() =>
      screen.getByLabelText(/restart the welcome tour/i),
    );
    expect(badge).toBeInTheDocument();
    // The badge is a <button>, not an <a> — clicking it routes via
    // router.push. Verify the navigation side effect on click.
    badge.click();
    expect(mockUseRouterPush).toHaveBeenCalledWith("/welcome");
  });

  it("hides the badge when welcome is already complete", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: new Date(),
          createdAt: oneHourAgo,
        }}
      />,
    );

    // Let the post-mount effect run; the badge must NOT appear.
    await waitFor(() => {
      expect(screen.queryByLabelText(/restart the welcome tour/i)).not.toBeInTheDocument();
    });
  });

  it("hides the badge after 7 days even if welcome is still incomplete", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    render(
      <StudentSidebar
        user={{
          firstName: "Maria",
          lastName: "S",
          role: "STUDENT",
          welcomeCompletedAt: null,
          createdAt: eightDaysAgo,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/restart the welcome tour/i)).not.toBeInTheDocument();
    });
  });
});

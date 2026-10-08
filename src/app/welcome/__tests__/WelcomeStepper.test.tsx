// @vitest-environment jsdom

/**
 * WelcomeStepper.test.tsx — STORY-146.
 *
 * Drives the client stepper through `@testing-library/react` in jsdom.
 * Covers the structural contract:
 * - Step 1 renders by default with the personalized first-slide body.
 * - Clicking the primary CTA advances the step.
 * - "Back" appears only on step >= 2.
 * - Clicking "Skip tour" (or the final-step CTA) calls
 *   `completeWelcomeAction()` and routes to `/dashboard`.
 * - `localStorage` and the URL fragment are updated on every step.
 *
 * Mirrors the test setup pattern used by
 * `src/components/student/__tests__/StudentNavigation.test.tsx`
 * (`// @vitest-environment jsdom` + `vi.mock` for actions + nav).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { completeWelcomeAction, push } = vi.hoisted(() => ({
  completeWelcomeAction: vi.fn().mockResolvedValue({
    ok: true,
    value: { completedAt: new Date("2026-09-20T10:00:00.000Z") },
  }),
  push: vi.fn(),
}));

vi.mock("@/app/actions/welcome.action", () => ({
  completeWelcomeAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { WelcomeStepper } from "../WelcomeStepper";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/welcome");
  completeWelcomeAction.mockClear();
  push.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("WelcomeStepper", () => {
  it("renders step 1 by default with the personalized greeting", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(screen.getByRole("heading", { name: /welcome to amph academy/i })).toBeInTheDocument();
    // Personalization: the first slide should include the user's firstName.
    expect(screen.getByText(/Maria, you're joining 500\+/i)).toBeInTheDocument();
  });

  it("shows the step counter and primary CTA on step 1", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start the tour/i })).toBeInTheDocument();
  });

  it("does not show a Back button on step 1", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
  });

  it("advances the step when the primary CTA is clicked", () => {
    render(<WelcomeStepper firstName="Maria" />);
    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    expect(
      screen.getByRole("heading", { name: /your dashboard is your home base/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it("shows a Back button from step 2 onward", () => {
    render(<WelcomeStepper firstName="Maria" />);
    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
  });

  it("Back returns to the previous step", () => {
    render(<WelcomeStepper firstName="Maria" />);
    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("heading", { name: /welcome to amph academy/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
  });

  it("renders the final-step CTA on the last slide", () => {
    render(<WelcomeStepper firstName="Maria" />);
    // Advance through all four intermediate steps.
    for (let i = 0; i < 4; i++) {
      const advance =
        screen.queryByRole("button", { name: /start the tour/i }) ??
        screen.getByRole("button", { name: /^next$/i });
      fireEvent.click(advance);
    }
    expect(screen.getByRole("button", { name: /take me to my dashboard/i })).toBeInTheDocument();
    // No "Skip tour" on the last slide.
    expect(screen.queryByRole("button", { name: /skip tour/i })).not.toBeInTheDocument();
  });

  it("renders the Skip tour link on every non-final step", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(screen.getByRole("button", { name: /skip tour/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    expect(screen.getByRole("button", { name: /skip tour/i })).toBeInTheDocument();
  });

  it("Skip tour calls completeWelcomeAction and routes to /dashboard", async () => {
    render(<WelcomeStepper firstName="Maria" />);
    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));

    await waitFor(() => {
      expect(completeWelcomeAction).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("the final-step CTA also completes welcome and routes to /dashboard", async () => {
    render(<WelcomeStepper firstName="Maria" />);
    for (let i = 0; i < 4; i++) {
      const advance =
        screen.queryByRole("button", { name: /start the tour/i }) ??
        screen.getByRole("button", { name: /^next$/i });
      fireEvent.click(advance);
    }

    fireEvent.click(screen.getByRole("button", { name: /take me to my dashboard/i }));

    await waitFor(() => {
      expect(completeWelcomeAction).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("still routes to /dashboard when completeWelcomeAction returns an error", async () => {
    completeWelcomeAction.mockResolvedValueOnce({
      ok: false,
      error: { kind: "error", message: "boom" },
    });

    render(<WelcomeStepper firstName="Maria" />);
    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));

    await waitFor(() => {
      expect(completeWelcomeAction).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("persists the current step to localStorage on each change", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(window.localStorage.getItem("amph.welcome.inProgress")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    expect(window.localStorage.getItem("amph.welcome.inProgress")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(window.localStorage.getItem("amph.welcome.inProgress")).toBe("2");
  });

  it("updates the URL fragment to #step-N on each change", () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(window.location.hash).toBe("#step-0");

    fireEvent.click(screen.getByRole("button", { name: /start the tour/i }));
    expect(window.location.hash).toBe("#step-1");
  });

  it("removes the localStorage key after a successful finish", async () => {
    render(<WelcomeStepper firstName="Maria" />);
    expect(window.localStorage.getItem("amph.welcome.inProgress")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem("amph.welcome.inProgress")).toBeNull();
    });
  });

  it("restores a previously-persisted step on mount", () => {
    // Pre-populate localStorage as if the user refreshed mid-tour at step 2.
    window.localStorage.setItem("amph.welcome.inProgress", "2");

    render(<WelcomeStepper firstName="Maria" />);
    expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /courses and lessons/i })).toBeInTheDocument();
  });
});

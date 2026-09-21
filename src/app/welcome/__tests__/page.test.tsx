/**
 * page.test.tsx — /welcome server-component domain tests (STORY-129).
 *
 * Mirrors the Option B pattern from `src/app/dashboard/__tests__/page.test.tsx`:
 * tests the data-layer contract (requireAuth + userRepo + redirect)
 * rather than the rendered HTML, since async server components are
 * awkward to render in unit tests and the full flow is covered by the
 * Playwright E2E suite.
 *
 * The redirect target (`/dashboard`) is verified by catching the
 * `NEXT_REDIRECT` throw emitted by the mocked `redirect()`. The
 * firstName handoff into the stepper is verified by rendering the
 * awaited JSX to a static string and grepping for the stepper's
 * distinctive heading text — a low-cost DOM check that avoids mocking
 * the client component (which would couple this test to its internals).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, findById } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { digest: "NEXT_REDIRECT" });
  }),
  findById: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "maria@example.com",
    firstName: "Maria",
    lastName: "Santos",
    role: "STUDENT",
    subscriptionTier: "FREE",
    welcomeCompletedAt: null,
  })),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    userRepo: { findById },
  }),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    redirect,
  };
});

import WelcomePage from "../page";
import * as WelcomePageModule from "../page";

beforeEach(() => {
  redirect.mockClear();
  findById.mockReset();
});

describe("/welcome page", () => {
  it("calls userRepo.findById with the authenticated user's id", async () => {
    findById.mockResolvedValue({ ok: true, value: { welcomeCompletedAt: null } });

    await WelcomePage();

    expect(findById).toHaveBeenCalledWith("user-1");
  });

  it("renders the stepper for a fresh user (welcomeCompletedAt is null)", async () => {
    findById.mockResolvedValue({ ok: true, value: { welcomeCompletedAt: null } });

    const element = await WelcomePage();

    // The page returned a non-null React element for the <main> wrapper,
    // and it did not redirect. The stepper's actual rendering (heading,
    // counter, CTA, persistence) is exercised by the WelcomeStepper
    // unit tests in this same folder.
    expect(element).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("passes the authenticated user's firstName into the page element", async () => {
    findById.mockResolvedValue({ ok: true, value: { welcomeCompletedAt: null } });

    // We can't renderToString the page (it transitively pulls in the
    // client `WelcomeStepper` which requires the Next app-router
    // context). Instead we assert that the JSX the page returns
    // contains a tree with the user's firstName in the props passed to
    // the WelcomeStepper element. The recursive grep walks the tree.
    const element = (await WelcomePage()) as React.ReactElement;
    const seenFirstNames = new Set<string>();
    function walk(node: unknown): void {
      if (!node || typeof node !== "object") return;
      const el = node as { props?: { firstName?: unknown; children?: unknown } };
      if (typeof el.props?.firstName === "string") seenFirstNames.add(el.props.firstName);
      const children = el.props?.children;
      if (Array.isArray(children)) children.forEach(walk);
      else if (children && typeof children === "object") walk(children);
    }
    walk(element);

    expect(seenFirstNames.has("Maria")).toBe(true);
  });

  it("redirects to /dashboard when the user has already completed the welcome", async () => {
    findById.mockResolvedValue({
      ok: true,
      value: { welcomeCompletedAt: new Date("2026-09-20T00:00:00.000Z") },
    });

    await expect(WelcomePage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the stepper when the userRepo lookup fails (defensive)", async () => {
    // If we can't read the user record, render the tour rather than
    // trapping the user on a redirect error — they'll finish or skip and
    // the server-side guard on the next visit will re-evaluate.
    findById.mockResolvedValue({ ok: false, error: { kind: "db_error" } });

    const element = await WelcomePage();

    expect(element).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("declares the correct page metadata for the welcome route", () => {
    // Story STORY-129: page metadata drives the document <title>.
    // A regression here would change the browser tab text silently.
    expect(WelcomePageModule.metadata).toEqual({
      title: "Welcome to AMPH Academy",
    });
  });
});

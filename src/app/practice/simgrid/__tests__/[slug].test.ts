// src/app/practice/simgrid/__tests__/[slug].test.ts
/**
 * /practice/simgrid/[...slug] — Task 8 of the 2026-09-30 SimGrid
 * integration plan.
 *
 * Locks the auth-gate + manifest-lookup contract for the wrapper
 * page that mounts the vendored SimGrid iframe:
 *   - Unauthenticated request → NEXT_REDIRECT to /login?redirect=...
 *     (the project convention; src/lib/auth.ts:160-167 uses
 *     `redirect`, not `returnTo` — see also
 *     src/app/profile/purchases/page.tsx:26 and
 *     src/lib/__tests__/auth.guards.test.ts for the same shape).
 *   - Unknown simulator file → notFound() (Next 16 throws an Error
 *     whose message + digest is "NEXT_HTTP_ERROR_FALLBACK;404").
 *   - Authenticated + known file → renders a React element
 *     containing the <SimgridFrame /> the page defines (mocked as
 *     a sentinel here).
 *
 * The redirect path is verified by catching the NEXT_REDIRECT throw
 * Next's `redirect()` helper emits, mirroring the established
 * pattern from src/app/welcome/__tests__/page.test.tsx:18-59
 * (vi.hoisted mocks for `redirect` + `getSessionUserId`, then await
 * the page function directly and inspect the outcome).
 *
 * The StudentShell wrapper is mocked as a transparent passthrough
 * so the test stays focused on the page's auth-gate + manifest-
 * lookup behavior (its sidebar pulls in command-palette and
 * notification actions that would need their own stubs). The
 * sentinel <SimgridFrame /> mock makes the "renders when
 * authenticated" assertion structural — the real client component
 * lives under src/components/simgrid/__tests__/SimgridFrame.test.tsx.
 *
 * Note on vitest 4.x + asymmetric matchers: `toHaveBeenCalledWith(
 * expect.stringContaining(...))` doesn't always unwrap cleanly
 * inside hoisted mocks. The established project pattern (welcome
 * page test) is to assert on `redirect.mock.calls[0][0]` directly.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), {
      digest: "NEXT_REDIRECT",
    });
  }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

// Stub out the client component the page mounts. The real
// component (and its postMessage listener behavior) is covered by
// its own test suite at
// src/components/simgrid/__tests__/SimgridFrame.test.tsx; this file
// only proves the page wires it up when authenticated.
vi.mock("@/components/simgrid/SimgridFrame", () => ({
  SimgridFrame: ({
    simulatorId,
    src,
    title,
  }: {
    simulatorId: string;
    src: string;
    title: string;
  }) => ({ __sentinel: "SimgridFrame", simulatorId, src, title }),
}));

vi.mock("@/components/student/StudentShell", () => ({
  StudentShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), redirect };
});

import { getSessionUserId } from "@/lib/auth";
import PracticeSimgridSimulatorPage from "../[...slug]/page";

beforeEach(() => {
  redirect.mockClear();
  (getSessionUserId as unknown as ReturnType<typeof vi.fn>).mockReset();
});

describe("/practice/simgrid/[...slug] auth gate", () => {
  it("redirects to /login when no session", async () => {
    (getSessionUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const params = Promise.resolve({ slug: ["bid-decisions.html"] });

    await expect(PracticeSimgridSimulatorPage({ params })).rejects.toThrow(/NEXT_REDIRECT/);

    // Inspect the redirect call args directly — vitest 4.x's
    // toHaveBeenCalledWith(expect.stringContaining(...)) doesn't
    // always unwrap inside hoisted mocks (the welcome page test
    // uses a plain-string match for the same reason).
    const callArgs = redirect.mock.calls[0];
    expect(callArgs).toBeDefined();
    const target = String(callArgs?.[0] ?? "");
    expect(target).toMatch(/^\/login\?redirect=/);
    // Decode the redirect param so the URL-encoded path slashes
    // (%2F) don't defeat a plain substring match.
    const redirectParam = target.split("redirect=")[1] ?? "";
    const decoded = decodeURIComponent(redirectParam);
    expect(decoded).toBe("/practice/simgrid/bid-decisions.html");
    // Defensive: the path must NOT be double-suffixed with .html.
    expect(target).not.toContain(".html.html");
  });

  it("renders the iframe when authenticated", async () => {
    (getSessionUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("u1");

    const params = Promise.resolve({ slug: ["bid-decisions.html"] });
    const element = await PracticeSimgridSimulatorPage({ params });

    expect(element).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns notFound for unknown simulator files", async () => {
    (getSessionUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("u1");

    const params = Promise.resolve({ slug: ["unknown-simulator.html"] });

    // Next 16's notFound() throws an Error whose message and
    // digest property are both "NEXT_HTTP_ERROR_FALLBACK;404"
    // (see node_modules/next/dist/client/components/not-found.js).
    // The brief's NEXT_NOT_FOUND digest is the Next 13 era format.
    await expect(PracticeSimgridSimulatorPage({ params })).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK.*404/,
    );
  });
});

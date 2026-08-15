/* eslint-disable no-restricted-syntax */
/**
 * /live-classes/[id] — page contract tests.
 *
 * STORY-091. The page renders one live class with metadata + RSVP gate.
 * This is a React 19 async server component, which the vitest runner
 * cannot render via `renderToString` (the component suspends under the
 * legacy renderer). The contract tests here therefore focus on what we
 * can verify without a full render:
 *
 *  1. The page module exists and exports a default async function.
 *  2. The class lookup runs against the container for the requested id.
 *  3. The enrollment check runs against the container for the authed user.
 *  4. H-08: the JSX source carries `<main id="main-content" tabIndex={-1}>`
 *     so the skip-link in the root layout can target it (WCAG 2.4.1
 *     Bypass Blocks Level A).
 *
 * Auth + container are mocked. StudentShell is mocked globally in
 * vitest.setup.ts so the server component tree can be exercised under
 * the legacy renderer without pulling in the full auth/sidebar chain.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(async () => null),
  requireAuth: () => mockRequireAuth(),
  getSessionUserId: vi.fn(async () => null),
  getSessionCookieName: () => "session_token",
  SESSION_COOKIE_NAME: "session_token",
}));

const mockLiveClassFindById = vi.fn();
const mockEnrollmentFindByUserId = vi.fn();
const mockRegistrationFindByUserAndClass = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    liveClassRepo: { findById: mockLiveClassFindById },
    enrollmentRepo: { findByUserId: mockEnrollmentFindByUserId },
    liveClassRegistrationRepo: {
      findByUserAndClass: mockRegistrationFindByUserAndClass,
    },
  }),
}));

import LiveClassDetailPage, { generateMetadata } from "../page";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_01",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Velasquez",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: ["course_01"],
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeLiveClass(overrides: Record<string, unknown> = {}) {
  return {
    id: "class_01",
    courseId: "course_01",
    title: "PPC bid strategy",
    scheduledAt: new Date("2026-09-01T10:00:00Z"),
    durationMinutes: 60,
    instructorId: "user_instructor",
    meetingUrl: "https://meet.example/class-01",
    status: "scheduled",
    recordingUrl: null,
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-01"),
    ...overrides,
  };
}

describe("/live-classes/[id]", () => {
  it("exports a default async function (the page module is reachable)", () => {
    expect(typeof LiveClassDetailPage).toBe("function");
  });

  it("exports a generateMetadata function for Next.js", async () => {
    mockRequireAuth.mockReset();
    mockLiveClassFindById.mockReset();
    mockEnrollmentFindByUserId.mockReset();
    mockRegistrationFindByUserAndClass.mockReset();

    mockRequireAuth.mockResolvedValue(makeUser());
    mockLiveClassFindById.mockResolvedValue({ ok: true, value: makeLiveClass() });
    mockEnrollmentFindByUserId.mockResolvedValue({ ok: true, value: [] });
    mockRegistrationFindByUserAndClass.mockResolvedValue({ ok: true, value: null });

    const meta = await generateMetadata({
      params: Promise.resolve({ id: "class_01" }),
    });
    expect(meta.title).toMatch(/PPC bid strategy/);
  });

  it("queries the live class by id via the container", async () => {
    mockRequireAuth.mockReset();
    mockLiveClassFindById.mockReset();
    mockEnrollmentFindByUserId.mockReset();
    mockRegistrationFindByUserAndClass.mockReset();

    mockRequireAuth.mockResolvedValue(makeUser());
    mockLiveClassFindById.mockResolvedValue({ ok: true, value: makeLiveClass() });
    mockEnrollmentFindByUserId.mockResolvedValue({ ok: true, value: [] });
    mockRegistrationFindByUserAndClass.mockResolvedValue({ ok: true, value: null });

    try {
      await LiveClassDetailPage({ params: Promise.resolve({ id: "class_01" }) });
    } catch {
      // React 19 async server components cannot be rendered under the
      // legacy renderer used by vitest; we only assert behavior here.
    }

    expect(mockLiveClassFindById).toHaveBeenCalledWith("class_01");
  });

  it("queries the user's enrollments to gate RSVP", async () => {
    mockRequireAuth.mockReset();
    mockLiveClassFindById.mockReset();
    mockEnrollmentFindByUserId.mockReset();
    mockRegistrationFindByUserAndClass.mockReset();

    mockRequireAuth.mockResolvedValue(makeUser());
    mockLiveClassFindById.mockResolvedValue({ ok: true, value: makeLiveClass() });
    mockEnrollmentFindByUserId.mockResolvedValue({ ok: true, value: [] });
    mockRegistrationFindByUserAndClass.mockResolvedValue({ ok: true, value: null });

    try {
      await LiveClassDetailPage({ params: Promise.resolve({ id: "class_01" }) });
    } catch {
      // ignore render failure
    }

    expect(mockEnrollmentFindByUserId).toHaveBeenCalledWith("user_01");
  });

  it("queries the user's existing registration for this class", async () => {
    mockRequireAuth.mockReset();
    mockLiveClassFindById.mockReset();
    mockEnrollmentFindByUserId.mockReset();
    mockRegistrationFindByUserAndClass.mockReset();

    mockRequireAuth.mockResolvedValue(makeUser());
    mockLiveClassFindById.mockResolvedValue({ ok: true, value: makeLiveClass() });
    mockEnrollmentFindByUserId.mockResolvedValue({ ok: true, value: [] });
    mockRegistrationFindByUserAndClass.mockResolvedValue({ ok: true, value: null });

    try {
      await LiveClassDetailPage({ params: Promise.resolve({ id: "class_01" }) });
    } catch {
      // ignore render failure
    }

    expect(mockRegistrationFindByUserAndClass).toHaveBeenCalledWith("user_01", "class_01");
  });

  // H-08: skip-link target. The skip-link in the root layout points
  // at #main-content. Every student-facing page must expose that id
  // on its <main> tag (plus tabIndex=-1 so the link target is
  // focusable). The literal JSX attribute on the page source is the
  // contract that guarantees the skip link actually lands somewhere
  // on this route. A render-based assertion is not feasible here
  // because the page is a React 19 async server component.
  it("contains <main id='main-content' tabIndex={-1}> in its JSX source", () => {
    const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
    expect(source).toMatch(/<main[^>]*\bid="main-content"[^>]*\btabIndex=\{-1\}/);
  });

  it("does not contain banned marketing phrases in its JSX source", () => {
    const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8").toLowerCase();
    expect(source).not.toContain("delve");
    expect(source).not.toContain("leverage");
    expect(source).not.toContain("seamless");
  });
});

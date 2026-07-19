/**
 * enroll.test.ts — TDD for the enrollStudent server action.
 *
 * The action is a thin shell:
 *  1. Read the userId from the session (via getSessionUserId)
 *  2. Delegate to the EnrollStudent use case via the container
 *  3. Return the use case's result
 *
 * Per the project's strict-SOLID rule, the action MUST NOT
 * instantiate InMemory* repositories directly. It MUST go through
 * the composition root (buildContainer) so the same wiring
 * applies in prod and test.
 *
 * What we test:
 *  - Returns unauthorized when there's no session
 *  - Forwards the session userId to the EnrollStudent use case
 *  - Returns the use case's success result (the Enrollment)
 *  - Maps use case errors (user_not_found, course_not_found,
 *    course_not_published, already_enrolled) to the action's
 *    return shape
 *  - Does NOT use InMemory* repos (regression guard)
 *
 * TDD: this test is written FIRST, watched to fail (the action
 * currently uses InMemory* directly), then refactored to use
 * the container.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("server-only", () => ({}));

// Mock next/headers so the cookie-reading code (if any) doesn't
// blow up in a non-Next context.
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));

// Mock getSessionUserId (the action should use this, not hand-roll
// a session read).
const mockGetSessionUserId: Mock<() => Promise<string | null>> = vi.fn(
  async () => "u-from-session",
);
vi.mock("@/lib/auth", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

// Mock the EnrollStudent use case so we can assert wiring without
// setting up the full container.
const mockEnrollStudentExecute = vi.fn();
vi.mock("@/usecases/EnrollStudent", () => ({
  EnrollStudent: vi.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => mockEnrollStudentExecute(...args),
  })),
}));

// Mock the container. The action should call buildContainer() and
// use its enrollStudent field. We assert the wiring.
const mockEnrollStudentInstance = { execute: mockEnrollStudentExecute };
const mockCourseRepoFindById = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    enrollStudent: mockEnrollStudentInstance,
    courseRepo: { findById: mockCourseRepoFindById },
  }),
}));

import { enrollStudent } from "../enroll";

beforeEach(() => {
  mockGetSessionUserId.mockClear();
  mockEnrollStudentExecute.mockClear();
  mockCourseRepoFindById.mockReset();
  // Default: a free course, so the action proceeds to call EnrollStudent
  mockCourseRepoFindById.mockResolvedValue({
    ok: true,
    value: { id: "course-1", price: { minor: 0, currency: "PHP" } },
  });
});

// ── Tests ───────────────────────────────────────────────────

describe("enrollStudent action", () => {
  it("returns unauthorized when there is no session (getSessionUserId returns null)", async () => {
    mockGetSessionUserId.mockResolvedValueOnce(null);
    const result = await enrollStudent("course-1");
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(mockEnrollStudentExecute).not.toHaveBeenCalled();
  });

  it("forwards the session userId to the EnrollStudent use case", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("u-from-session");
    mockEnrollStudentExecute.mockResolvedValueOnce({
      ok: true,
      value: { id: "enrol-1", userId: "u-from-session", courseId: "course-1" },
    });
    await enrollStudent("course-1");
    expect(mockEnrollStudentExecute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-from-session", courseId: "course-1" }),
    );
  });

  it("returns the use case's success result (the Enrollment)", async () => {
    const fakeEnrollment = {
      id: "enrol-1",
      userId: "u-from-session",
      courseId: "course-1",
      enrolledAt: new Date("2026-01-01"),
    };
    mockEnrollStudentExecute.mockResolvedValueOnce({
      ok: true,
      value: fakeEnrollment,
    });
    const result = await enrollStudent("course-1");
    expect(result).toEqual({ ok: true, value: fakeEnrollment });
  });

  it("maps use case errors to the action's return shape", async () => {
    mockEnrollStudentExecute.mockResolvedValueOnce({
      ok: false,
      error: { kind: "course_not_found" },
    });
    const result = await enrollStudent("missing-course");
    expect(result).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });

  it("returns the use case's already_enrolled error", async () => {
    mockEnrollStudentExecute.mockResolvedValueOnce({
      ok: false,
      error: { kind: "already_enrolled" },
    });
    const result = await enrollStudent("course-1");
    expect(result).toEqual({ ok: false, error: { kind: "already_enrolled" } });
  });

  it("returns paid_checkout_required when the course has a non-zero price (P0-1)", async () => {
    mockCourseRepoFindById.mockResolvedValueOnce({
      ok: true,
      value: { id: "course-1", price: { minor: 100000, currency: "PHP" } },
    });
    const result = await enrollStudent("course-1");
    expect(result).toEqual({ ok: false, error: { kind: "paid_checkout_required" } });
    expect(mockEnrollStudentExecute).not.toHaveBeenCalled();
  });

  it("forwards entitlement=free for a free course (P0-1)", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("u-from-session");
    mockEnrollStudentExecute.mockResolvedValueOnce({
      ok: true,
      value: { id: "enrol-1", userId: "u-from-session", courseId: "course-1" },
    });
    await enrollStudent("course-1");
    expect(mockEnrollStudentExecute).toHaveBeenCalledWith(
      expect.objectContaining({ entitlement: "free" }),
    );
  });

  it("does NOT instantiate InMemory* repositories directly (SOLID regression guard)", async () => {
    // Static-analysis check: the action's source must not contain
    // direct instantiations of InMemory* adapters. If a future
    // refactor reverts to the hand-rolled pattern, this test
    // will fail before the test-suite even runs.
    const actionPath = path.resolve(
      process.cwd(),
      "src/app/actions/enroll.ts",
    );
    const source = await fs.readFile(actionPath, "utf8");
    // No `new InMemory` calls (anywhere in the file)
    expect(source).not.toMatch(/new\s+InMemory/);
    // No direct imports of InMemory* adapters
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemory/);
  });
});

/**
 * route.test.ts — TDD for the POST /api/quizzes/[quizId]/attempt
 * route handler.
 *
 * The route is a thin shell:
 *  1. Extract the user id from the session cookie (via getSessionUserId)
 *  2. Parse the JSON body
 *  3. Delegate to processQuizAttempt
 *  4. Map the result to a NextResponse
 *
 * Per the project's SOLID/TDD discipline, the route must:
 *  - Use getSessionUserId from src/lib/auth.ts (the sanctioned
 *    session-reading helper), NOT hand-roll a JWT verify
 *  - Handle the missing-cookie case by passing userId="" to the
 *    use case (the use case then returns a validation error)
 *  - Handle the malformed-JSON case by returning 400
 *
 * What we test:
 *  - Calls getSessionUserId (not a hand-rolled JWT verify)
 *  - Returns 400 for malformed JSON
 *  - Returns 200 with the use case's value on success
 *  - Returns the use case's status code on error
 *  - When getSessionUserId returns null (no cookie), still calls
 *    the use case with userId="" (the use case validates this)
 *
 * TDD: this test is written FIRST, watched to fail (the route
 * currently uses a hand-rolled JWT verify), then refactored to
 * use getSessionUserId.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock src/lib/auth — we want to verify the route uses
// getSessionUserId and not hand-rolled JWT verification.
const mockGetSessionUserId: Mock<() => Promise<string | null>> = vi.fn(
  async () => "u-test-1",
);
vi.mock("@/lib/auth", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

// Mock next/server's NextRequest + NextResponse
const mockCookies = vi.fn(() => ({
  get: vi.fn((name: string) => (name === "amph_session" ? { value: "mock-token" } : undefined)),
}));
vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    cookies = mockCookies();
    json = vi.fn();
    constructor(_init: unknown) {}
  },
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

// Mock processQuizAttempt to avoid wiring up the full use case
const mockProcessQuizAttempt = vi.fn();
vi.mock("../processQuizAttempt", () => ({
  processQuizAttempt: (...args: unknown[]) => mockProcessQuizAttempt(...args),
}));

// Mock the container
const mockContainer = {
  processQuizAttempt: undefined, // placeholder so the mock above wins
};
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({}),
}));

import { POST } from "../route";

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetSessionUserId.mockClear();
  mockProcessQuizAttempt.mockClear();
  // Default: the use case returns success
  mockProcessQuizAttempt.mockResolvedValue({
    ok: true,
    status: 200,
    value: { attemptId: "a-1", score: 8, totalQuestions: 10, correctCount: 8 },
  });
});

// ── Tests ──────────────────────────────────────────────────────

describe("POST /api/quizzes/[quizId]/attempt — route handler", () => {
  it("uses getSessionUserId (not a hand-rolled JWT verify)", async () => {
    // Build a NextRequest-like object
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => ({ answers: [{ questionId: "q1", selectedOptionId: "o1" }] })),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    await POST(request, ctx);

    // The route MUST use getSessionUserId, not hand-roll a JWT verify
    expect(mockGetSessionUserId).toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => {
        throw new Error("Invalid JSON");
      }),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    const response = await POST(request, ctx);
    expect(response.status).toBe(400);
    // The use case is NOT called when the body is malformed
    expect(mockProcessQuizAttempt).not.toHaveBeenCalled();
  });

  it("returns 200 with the use case's value on success", async () => {
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => ({ answers: [{ questionId: "q1", selectedOptionId: "o1" }] })),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    const response = await POST(request, ctx);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      attemptId: "a-1",
      score: 8,
    });
  });

  it("forwards the userId from getSessionUserId to processQuizAttempt", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("u-from-session");
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => ({ answers: [{ questionId: "q1", selectedOptionId: "o1" }] })),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    await POST(request, ctx);

    expect(mockProcessQuizAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "u-from-session", quizId: "quiz-1" }),
    );
  });

  it("passes userId=\"\" when getSessionUserId returns null (no session)", async () => {
    mockGetSessionUserId.mockResolvedValueOnce(null);
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => ({ answers: [{ questionId: "q1", selectedOptionId: "o1" }] })),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    // The use case is still called (it will validate the userId and
    // return an error). The route doesn't gate on the userId.
    await POST(request, ctx);
    expect(mockProcessQuizAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "" }),
    );
  });

  it("returns the use case's error status code", async () => {
    mockProcessQuizAttempt.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: { kind: "denied_not_authenticated", message: "no user" },
    });
    const request = {
      cookies: { get: vi.fn() },
      json: vi.fn(async () => ({ answers: [{ questionId: "q1", selectedOptionId: "o1" }] })),
    } as unknown as Parameters<typeof POST>[0];
    const ctx = { params: Promise.resolve({ quizId: "quiz-1" }) };

    const response = await POST(request, ctx);
    expect(response.status).toBe(403);
  });

  it("does NOT import JoseJwtService directly (SOLID: use the composition root or src/lib/auth)", async () => {
    // The route MUST NOT import JoseJwtService directly. If a future
    // refactor reverts to hand-rolling JWT verification, this test
    // will start failing because the route's module will pull in
    // JoseJwtService (and its transitive deps) into the test env.
    //
    // This is a regression guard via static-analysis: the module
    // under test should have ZERO import statements referencing
    // JoseJwtService or JWT_SECRET. We grep the source for the
    // import patterns.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const routePath = path.resolve(
      process.cwd(),
      "src/app/api/quizzes/[quizId]/attempt/route.ts",
    );
    const source = await fs.readFile(routePath, "utf8");
    // No import of JoseJwtService
    expect(source).not.toMatch(/^import\s.*JoseJwtService/m);
    // No reading of JWT_SECRET (would indicate hand-rolled verify)
    expect(source).not.toMatch(/process\.env\.JWT_SECRET/);
  });
});

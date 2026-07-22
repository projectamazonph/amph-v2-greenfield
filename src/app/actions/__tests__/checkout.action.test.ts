/**
 * checkout.action — STORY-021.
 *
 * Tests for the startCheckout server action. The action is the
 * server-side entrypoint that turns a course slug into a
 * PayMongo-hosted checkout URL. It:
 *  1. Validates the courseSlug is non-empty
 *  2. Reads the userId from the session
 *  3. Calls CreatePaymentIntent through the container
 *  4. Returns the redirect state with the checkoutUrl + orderId
 *  5. Maps use-case errors to action states
 *
 * We mock the container so the test doesn't need a real database
 * or PayMongo SDK. The CreatePaymentIntent use case itself has
 * its own test suite at tests/unit/usecases/CreatePaymentIntent.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────

// Mock getSessionUserId so we control the auth state per test.
const mockGetSessionUserId = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

// Mock buildContainer so we control the CreatePaymentIntent output.
const mockCreatePaymentIntent = vi.fn();
const mockRateLimiterCheck = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    createPaymentIntent: { execute: mockCreatePaymentIntent },
    rateLimiter: { check: mockRateLimiterCheck },
  }),
}));

// Mock the form data extraction path: FormData → string
function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    fd.set(k, v);
  }
  return fd;
}

import { startCheckout, CHECKOUT_INITIAL_STATE } from "../checkout.action";

describe("startCheckout (server action)", () => {
  beforeEach(() => {
    mockGetSessionUserId.mockReset();
    mockCreatePaymentIntent.mockReset();
    mockRateLimiterCheck.mockReset();
    mockRateLimiterCheck.mockResolvedValue({
      ok: true,
      value: { allowed: true, remaining: 9, resetSeconds: 3600 },
    });
  });

  it("exports an initial state of kind: idle", () => {
    expect(CHECKOUT_INITIAL_STATE).toEqual({ kind: "idle" });
  });

  it("returns invalid_input when courseSlug is empty", async () => {
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "" }));
    expect(result.kind).toBe("invalid_input");
    if (result.kind === "invalid_input") {
      expect(result.message).toMatch(/missing course/i);
    }
    expect(mockGetSessionUserId).not.toHaveBeenCalled();
    expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
  });

  it("returns invalid_input when courseSlug is missing from the form", async () => {
    const result = await startCheckout({ kind: "idle" }, makeFormData({}));
    expect(result.kind).toBe("invalid_input");
  });

  it("returns unauthorized when no session is present", async () => {
    mockGetSessionUserId.mockResolvedValueOnce(null);
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(result.kind).toBe("unauthorized");
    expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
  });

  it("returns redirect with the PayMongo URL on success", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: true,
      checkoutUrl: "https://paymongo.com/cs_test_abc",
      orderId: "ord_1",
    });
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(result.kind).toBe("redirect");
    if (result.kind === "redirect") {
      expect(result.checkoutUrl).toBe("https://paymongo.com/cs_test_abc");
      expect(result.orderId).toBe("ord_1");
    }
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
      userId: "user-1",
      courseSlug: "ppc-101",
    });
  });

  it("maps course_not_found to a course_not_found state", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: false,
      error: { kind: "course_not_found" },
    });
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "missing" }));
    expect(result.kind).toBe("course_not_found");
  });

  it("maps course_not_published to a course_not_published state", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: false,
      error: { kind: "course_not_published" },
    });
    const result = await startCheckout(
      { kind: "idle" },
      makeFormData({ courseSlug: "draft-course" }),
    );
    expect(result.kind).toBe("course_not_published");
  });

  it("maps already_enrolled to an already_enrolled state", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: false,
      error: { kind: "already_enrolled" },
    });
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(result.kind).toBe("already_enrolled");
  });

  it("maps payment_error to a payment_error state with the message", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: false,
      error: { kind: "payment_error", message: "PayMongo down" },
    });
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(result.kind).toBe("payment_error");
    if (result.kind === "payment_error") {
      expect(result.message).toBe("PayMongo down");
    }
  });

  it("returns rate_limited and skips CreatePaymentIntent when the limiter denies the request", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockRateLimiterCheck.mockResolvedValueOnce({
      ok: true,
      value: { allowed: false, remaining: 0, resetSeconds: 3600 },
    });
    const result = await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(result.kind).toBe("rate_limited");
    expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
  });

  it("calls the rate limiter with a user-scoped key", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: true,
      checkoutUrl: "https://paymongo.com/cs_test_abc",
      orderId: "ord_1",
    });
    await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "ppc-101" }));
    expect(mockRateLimiterCheck).toHaveBeenCalledWith(
      expect.objectContaining({ key: "checkout:user:user-1" }),
    );
  });

  it("trims whitespace from the courseSlug before passing it on", async () => {
    mockGetSessionUserId.mockResolvedValueOnce("user-1");
    mockCreatePaymentIntent.mockResolvedValueOnce({
      ok: true,
      checkoutUrl: "https://paymongo.com/cs_test",
      orderId: "ord_1",
    });
    await startCheckout({ kind: "idle" }, makeFormData({ courseSlug: "  ppc-101  " }));
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
      userId: "user-1",
      courseSlug: "ppc-101",
    });
  });
});

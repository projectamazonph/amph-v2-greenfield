/**
 * GET /admin/payments/export — P3-85.
 *
 * Verifies the route gates on admin auth and streams a CSV with the
 * correct content type and content disposition.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (the route's transitive deps pull it in)
vi.mock("server-only", () => ({}));

const mockGetSessionUserId = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    userRepo: {
      findById: async () => ({ ok: true, value: { role: "ADMIN" } }),
    },
    exportPayments: {
      execute: async () => ({
        ok: true,
        rows: [
          {
            id: "o1",
            userEmail: "a@b.com",
            courseId: "c1",
            totalMinor: 299900,
            status: "PAID",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
      }),
    },
  }),
}));

import { GET } from "../route";

function makeRequest(url: string): Request {
  return new Request(new URL(url, "http://localhost"));
}

describe("GET /admin/payments/export", () => {
  beforeEach(() => {
    mockGetSessionUserId.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockGetSessionUserId.mockResolvedValue(null);

    const req = makeRequest("http://localhost/admin/payments/export");
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it("returns CSV with correct headers when admin", async () => {
    mockGetSessionUserId.mockResolvedValue("admin_1");

    const req = makeRequest("http://localhost/admin/payments/export");
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="payments-.*\.csv"/,
    );

    const body = await res.text();
    expect(body).toContain(
      '"Order ID","Buyer Email","Course ID","Total (PHP)","Status","Created At"',
    );
    expect(body).toContain('"o1","a@b.com","c1"');
  });
});

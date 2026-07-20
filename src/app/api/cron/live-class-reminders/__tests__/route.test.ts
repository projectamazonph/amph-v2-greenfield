/**
 * POST /api/cron/live-class-reminders — route contract tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockExecute = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    sendLiveClassReminders: {
      execute: mockExecute,
    },
  }),
}));

import { POST, GET } from "../route";

describe("/api/cron/live-class-reminders", () => {
  beforeEach(() => {
    mockExecute.mockReset();
    process.env["CRON_SECRET"] = "test-secret";
  });

  it("rejects requests without x-cron-secret", async () => {
    const req = new Request("http://test/api/cron/live-class-reminders", {
      method: "POST",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong x-cron-secret", async () => {
    const req = new Request("http://test/api/cron/live-class-reminders", {
      method: "POST",
      headers: { "x-cron-secret": "wrong" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("runs the use case and returns the count on success", async () => {
    mockExecute.mockResolvedValue({
      ok: true,
      value: { emailsSent: 5, classesProcessed: 2 },
    });
    const req = new Request("http://test/api/cron/live-class-reminders", {
      method: "POST",
      headers: { "x-cron-secret": "test-secret" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.emailsSent).toBe(5);
    expect(body.classesProcessed).toBe(2);
  });

  it("returns 500 on use case error", async () => {
    mockExecute.mockResolvedValue({
      ok: false,
      error: { kind: "repo_error", message: "boom" },
    });
    const req = new Request("http://test/api/cron/live-class-reminders", {
      method: "POST",
      headers: { "x-cron-secret": "test-secret" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });

  it("returns 500 if CRON_SECRET is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const req = new Request("http://test/api/cron/live-class-reminders", {
      method: "POST",
      headers: { "x-cron-secret": "anything" },
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/cron/live-class-reminders (health)", () => {
  beforeEach(() => {
    process.env["CRON_SECRET"] = "test-secret";
  });

  it("returns 200 when secret is configured", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns 500 when secret is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

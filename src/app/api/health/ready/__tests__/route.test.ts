/**
 * /api/health/ready — Proposal 5.
 *
 * Mocks @/composition/container so the readiness probe's DB-failure
 * branch can be exercised without a real database. The route goes
 * through container.databaseHealthCheck.ping() rather than importing
 * @/infra/database/prisma directly (app/ must not import infra/
 * directly — tests/architecture/dependency-direction.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const pingMock = vi.fn();

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    databaseHealthCheck: { ping: pingMock },
  }),
}));

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    pingMock.mockReset();
  });

  it("returns 200 with status ok when the database responds", async () => {
    pingMock.mockResolvedValueOnce({ ok: true, value: undefined });
    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: "amph-v2-greenfield" });
  });

  it("returns 503 with status unavailable when the database check fails", async () => {
    pingMock.mockResolvedValueOnce({
      ok: false,
      error: { kind: "db_error", message: "connection refused" },
    });
    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: "unavailable", service: "amph-v2-greenfield" });
  });

  it("does not leak the raw error message in the response body", async () => {
    pingMock.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: "db_error",
        message: "postgresql://user:secret@host/db unreachable",
      },
    });
    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("secret");
    expect(bodyText).not.toContain("postgresql://");
  });
});

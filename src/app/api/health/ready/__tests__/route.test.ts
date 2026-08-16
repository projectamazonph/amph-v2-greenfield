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
const simulatorRegistryListMock = vi.fn();
const findPublishedMock = vi.fn();

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    databaseHealthCheck: { ping: pingMock },
    simulatorRegistry: { list: simulatorRegistryListMock },
    scenarioRepo: { findPublished: findPublishedMock },
  }),
}));

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    pingMock.mockReset();
    simulatorRegistryListMock.mockReset();
    findPublishedMock.mockReset();
    // Defaults: DB up, no registered simulators, no published rows.
    // Empty registry means the new scenario-data-integrity check
    // is a no-op — keeps the original three tests' behavior identical.
    pingMock.mockResolvedValue({ ok: true, value: undefined });
    simulatorRegistryListMock.mockReturnValue([]);
    findPublishedMock.mockResolvedValue({ ok: true, value: null });
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

  // ── Scenario data-integrity check ────────────────────────────────────
  // Every simulator registered in the SimulatorRegistry must have a
  // published SimulatorScenario row, otherwise that simulator's start/
  // grade actions fail with `scenario_not_found` at runtime (the
  // production bug that surfaced on 2026-08-16). The readiness probe
  // surfaces this at deploy time, not deep inside a request handler.

  it("returns 503 with status missing_scenarios listing simulator ids when at least one registered simulator has no published row", async () => {
    pingMock.mockResolvedValueOnce({ ok: true, value: undefined });
    simulatorRegistryListMock.mockReturnValueOnce([
      { simulatorId: "bid-elevator" },
      { simulatorId: "missing-sim" },
      { simulatorId: "another-missing" },
    ]);
    findPublishedMock.mockImplementation(async (simId) => {
      if (simId === "bid-elevator") {
        return {
          ok: true,
          value: { id: "bid-elevator-scenario-default", simulatorId: "bid-elevator" },
        };
      }
      return { ok: true, value: null };
    });

    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "missing_scenarios",
      service: "amph-v2-greenfield",
    });
    expect(body.missing).toEqual(expect.arrayContaining(["missing-sim", "another-missing"]));
    expect(body.missing).not.toContain("bid-elevator");
  });

  it("returns 200 ok when every registered simulator has a published row", async () => {
    pingMock.mockResolvedValueOnce({ ok: true, value: undefined });
    simulatorRegistryListMock.mockReturnValueOnce([
      { simulatorId: "bid-elevator" },
      { simulatorId: "str-triage" },
    ]);
    findPublishedMock.mockResolvedValue({
      ok: true,
      value: { id: "x", simulatorId: "x" },
    });

    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: "amph-v2-greenfield" });
  });

  it("returns 503 unavailable and skips the scenario check when the database ping fails", async () => {
    pingMock.mockResolvedValueOnce({
      ok: false,
      error: { kind: "db_error", message: "connection refused" },
    });
    // If the route correctly short-circuits on DB failure, the
    // registry list and scenario findPublished should never run —
    // set them to throw and the test will surface that.
    simulatorRegistryListMock.mockImplementation(() => {
      throw new Error("simulatorRegistry.list() must not be called when DB ping fails");
    });
    findPublishedMock.mockImplementation(() => {
      throw new Error("scenarioRepo.findPublished() must not be called when DB ping fails");
    });

    const { GET } = await import("../route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: "unavailable", service: "amph-v2-greenfield" });
    expect(body.missing).toBeUndefined();
  });
});

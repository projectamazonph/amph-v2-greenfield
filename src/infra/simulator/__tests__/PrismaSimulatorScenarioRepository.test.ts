/**
 * PrismaSimulatorScenarioRepository adapter test, P0-2 follow-up (STORY-050b).
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaPasswordResetRepository.test.ts / PrismaOrderRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaSimulatorScenarioRepository } from "@/infra/simulator/PrismaSimulatorScenarioRepository";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";

interface ScenarioRow {
  id: string;
  simulatorId: string;
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  difficulty: string;
  estimatedMinutes: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: ScenarioRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  simulatorScenario = {
    create: async (args: { data: Omit<ScenarioRow, "archivedAt" | "createdAt" | "updatedAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id)) {
        const err = new Error("unique constraint violation") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      const row: ScenarioRow = {
        ...args.data,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    findMany: async (args: { where?: { archivedAt?: null; simulatorId?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      if (args.where?.archivedAt === null) {
        rows = rows.filter((r) => r.archivedAt === null);
      }
      if (args.where?.simulatorId !== undefined) {
        rows = rows.filter((r) => r.simulatorId === args.where!.simulatorId);
      }
      return rows;
    },
    update: async (args: { where: { id: string }; data: Partial<ScenarioRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
  };
}

function makeScenario(overrides: Partial<SimulatorScenario> = {}): SimulatorScenario {
  return {
    id: overrides.id ?? "sc_1",
    simulatorId: overrides.simulatorId ?? "bid-elevator",
    name: overrides.name ?? "Aggressive Bidding on a Thin Margin",
    description: overrides.description ?? "Push bids on a low-margin ASIN without tanking ACOS.",
    inputSchema: overrides.inputSchema ?? { type: "object" },
    outputSchema: overrides.outputSchema ?? { type: "object" },
    difficulty: overrides.difficulty ?? "intermediate",
    estimatedMinutes: overrides.estimatedMinutes ?? 15,
  };
}

describe("PrismaSimulatorScenarioRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaSimulatorScenarioRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaSimulatorScenarioRepository(db as never);
  });

  // ── create + findById ──────────────────────────────────────

  it("create + findById round-trips a scenario", async () => {
    const createResult = await repo.create(makeScenario());
    expect(createResult.ok).toBe(true);

    const found = await repo.findById("sc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.name).toBe("Aggressive Bidding on a Thin Margin");
    expect(found.value?.simulatorId).toBe("bid-elevator");
    expect(found.value?.difficulty).toBe("intermediate");
  });

  it("findById returns null for an unknown id (not an error)", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── listAll ────────────────────────────────────────────────

  it("listAll returns every active scenario", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    await repo.create(makeScenario({ id: "sc_2" }));

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => s.id).sort()).toEqual(["sc_1", "sc_2"]);
  });

  it("listAll excludes archived scenarios", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    await repo.create(makeScenario({ id: "sc_2" }));
    await repo.archive("sc_1");

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => s.id)).toEqual(["sc_2"]);
  });

  it("listAll filters by simulatorId", async () => {
    await repo.create(makeScenario({ id: "sc_1", simulatorId: "bid-elevator" }));
    await repo.create(makeScenario({ id: "sc_2", simulatorId: "str-triage" }));

    const result = await repo.listAll({ simulatorId: "bid-elevator" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => s.id)).toEqual(["sc_1"]);
  });

  // ── findById + archived (hidden) ─────────────────────────────

  it("findById returns null for an archived scenario (hidden, matching InMemory contract)", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    await repo.archive("sc_1");
    const result = await repo.findById("sc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── update ─────────────────────────────────────────────────

  it("update persists changed fields", async () => {
    await repo.create(makeScenario({ id: "sc_1", estimatedMinutes: 15 }));
    const result = await repo.update(makeScenario({ id: "sc_1", estimatedMinutes: 25 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estimatedMinutes).toBe(25);
  });

  it("update returns not_found when the scenario does not exist", async () => {
    const result = await repo.update(makeScenario({ id: "never-created" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── archive ────────────────────────────────────────────────

  it("archive hides the scenario from listAll and findById", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    const result = await repo.archive("sc_1");
    expect(result.ok).toBe(true);

    const listResult = await repo.listAll();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) expect(listResult.value).toEqual([]);
  });

  it("archive returns not_found when the scenario does not exist", async () => {
    const result = await repo.archive("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── defensive validation on read (corrupt/legacy rows) ──────

  it("findById returns db_error instead of hydrating a row with an invalid simulatorId", async () => {
    db.rows.push({
      id: "corrupt-1",
      simulatorId: "not-a-real-simulator",
      name: "Bad Row",
      description: "n/a",
      inputSchema: {},
      outputSchema: {},
      difficulty: "beginner",
      estimatedMinutes: 10,
      archivedAt: null,
      createdAt: new Date(1),
      updatedAt: new Date(1),
    });

    const result = await repo.findById("corrupt-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error instead of hydrating a row with an invalid difficulty", async () => {
    db.rows.push({
      id: "corrupt-2",
      simulatorId: "bid-elevator",
      name: "Bad Row",
      description: "n/a",
      inputSchema: {},
      outputSchema: {},
      difficulty: "impossible",
      estimatedMinutes: 10,
      archivedAt: null,
      createdAt: new Date(1),
      updatedAt: new Date(1),
    });

    const result = await repo.findById("corrupt-2");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── error mapping ──────────────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeScenario());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("listAll returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listAll();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("update returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    db.failNextUpdate = true;
    const result = await repo.update(makeScenario({ id: "sc_1" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("archive returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    db.failNextUpdate = true;
    const result = await repo.archive("sc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

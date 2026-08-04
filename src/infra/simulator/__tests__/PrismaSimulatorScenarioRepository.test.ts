/**
 * PrismaSimulatorScenarioRepository adapter test, P0-2 follow-up (STORY-050b).
 * STORY-085: publishing + versioning — findPublished/listVersions/publish.
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
  scenarioKey: string;
  version: number;
  status: string;
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
    findUniqueOrThrow: async (args: { where: { id: string } }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) throw new Error("Record not found");
      return row;
    },
    findFirst: async (args: {
      where?: { simulatorId?: string; status?: string; scenarioKey?: string; id?: { not: string } };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      if (args.where?.simulatorId !== undefined) {
        rows = rows.filter((r) => r.simulatorId === args.where!.simulatorId);
      }
      if (args.where?.scenarioKey !== undefined) {
        rows = rows.filter((r) => r.scenarioKey === args.where!.scenarioKey);
      }
      if (args.where?.status !== undefined) {
        rows = rows.filter((r) => r.status === args.where!.status);
      }
      if (args.where?.id?.not !== undefined) {
        rows = rows.filter((r) => r.id !== args.where!.id!.not);
      }
      return rows[0] ?? null;
    },
    findMany: async (args: {
      where?: { status?: { not: string } | string; simulatorId?: string; scenarioKey?: string };
      orderBy?: { version?: "asc" | "desc" };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      const status = args.where?.status;
      if (status !== undefined) {
        if (typeof status === "string") {
          rows = rows.filter((r) => r.status === status);
        } else {
          rows = rows.filter((r) => r.status !== status.not);
        }
      }
      if (args.where?.simulatorId !== undefined) {
        rows = rows.filter((r) => r.simulatorId === args.where!.simulatorId);
      }
      if (args.where?.scenarioKey !== undefined) {
        rows = rows.filter((r) => r.scenarioKey === args.where!.scenarioKey);
      }
      if (args.orderBy?.version === "desc") {
        rows.sort((a, b) => b.version - a.version);
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

  async $transaction<T extends unknown[]>(promises: [...T]): Promise<T> {
    return Promise.all(promises) as Promise<T>;
  }
}

function makeScenario(overrides: Partial<SimulatorScenario> = {}): SimulatorScenario {
  const id = overrides.id ?? "sc_1";
  return {
    id,
    scenarioKey: overrides.scenarioKey ?? id,
    version: overrides.version ?? 1,
    status: overrides.status ?? "published",
    simulatorId: overrides.simulatorId ?? "bid-elevator",
    name: overrides.name ?? "Aggressive Bidding on a Thin Margin",
    description: overrides.description ?? "Push bids on a low-margin ASIN without tanking ACOS.",
    inputSchema: overrides.inputSchema ?? { type: "object" },
    outputSchema: overrides.outputSchema ?? { type: "object" },
    difficulty: overrides.difficulty ?? "intermediate",
    estimatedMinutes: overrides.estimatedMinutes ?? 15,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
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
    expect(found.value?.scenarioKey).toBe("sc_1");
    expect(found.value?.version).toBe(1);
    expect(found.value?.status).toBe("published");
  });

  it("findById returns null for an unknown id (not an error)", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findById resolves an archived scenario (unlike listAll, findById does not filter by status)", async () => {
    await repo.create(makeScenario({ id: "sc_1" }));
    await repo.archive("sc_1");
    const result = await repo.findById("sc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.status).toBe("archived");
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

  it("archive hides the scenario from listAll", async () => {
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

  // ── findPublished (STORY-085) ────────────────────────────────

  it("findPublished returns the published scenario for a simulator", async () => {
    await repo.create(
      makeScenario({ id: "sc_1", simulatorId: "bid-elevator", status: "published" }),
    );
    const result = await repo.findPublished("bid-elevator");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.id).toBe("sc_1");
  });

  it("findPublished returns null when nothing is published yet", async () => {
    await repo.create(makeScenario({ id: "sc_1", simulatorId: "bid-elevator", status: "draft" }));
    const result = await repo.findPublished("bid-elevator");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── listVersions (STORY-085) ─────────────────────────────────

  it("listVersions returns every version for a scenarioKey, newest first", async () => {
    await repo.create(
      makeScenario({ id: "sc_1", scenarioKey: "family-a", version: 1, status: "archived" }),
    );
    await repo.create(
      makeScenario({ id: "sc_2", scenarioKey: "family-a", version: 2, status: "published" }),
    );
    await repo.create(
      makeScenario({ id: "sc_3", scenarioKey: "family-b", version: 1, status: "published" }),
    );

    const result = await repo.listVersions("family-a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => s.id)).toEqual(["sc_2", "sc_1"]);
  });

  // ── publish (STORY-085) ───────────────────────────────────────

  it("publish marks a draft published", async () => {
    await repo.create(
      makeScenario({ id: "sc_1", scenarioKey: "family-a", version: 1, status: "draft" }),
    );
    const result = await repo.publish("sc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("published");
  });

  it("publish archives the previously-published sibling under the same scenarioKey", async () => {
    await repo.create(
      makeScenario({ id: "sc_1", scenarioKey: "family-a", version: 1, status: "published" }),
    );
    await repo.create(
      makeScenario({ id: "sc_2", scenarioKey: "family-a", version: 2, status: "draft" }),
    );

    const result = await repo.publish("sc_2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("published");

    const sibling = await repo.findById("sc_1");
    expect(sibling.ok).toBe(true);
    if (!sibling.ok) return;
    expect(sibling.value?.status).toBe("archived");
  });

  it("publish does not touch a published scenario from a different scenarioKey", async () => {
    await repo.create(
      makeScenario({ id: "sc_1", scenarioKey: "family-a", version: 1, status: "published" }),
    );
    await repo.create(
      makeScenario({ id: "sc_2", scenarioKey: "family-b", version: 1, status: "draft" }),
    );

    await repo.publish("sc_2");

    const untouched = await repo.findById("sc_1");
    expect(untouched.ok).toBe(true);
    if (!untouched.ok) return;
    expect(untouched.value?.status).toBe("published");
  });

  it("publish returns not_found when the scenario does not exist", async () => {
    const result = await repo.publish("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── defensive validation on read (corrupt/legacy rows) ──────

  it("findById returns db_error instead of hydrating a row with an invalid simulatorId", async () => {
    db.rows.push({
      id: "corrupt-1",
      scenarioKey: "corrupt-1",
      version: 1,
      status: "published",
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
      scenarioKey: "corrupt-2",
      version: 1,
      status: "published",
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

  it("findById returns db_error instead of hydrating a row with an invalid status", async () => {
    db.rows.push({
      id: "corrupt-3",
      scenarioKey: "corrupt-3",
      version: 1,
      status: "not-a-real-status",
      simulatorId: "bid-elevator",
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

    const result = await repo.findById("corrupt-3");
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

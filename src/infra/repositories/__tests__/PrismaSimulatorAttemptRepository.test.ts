/**
 * PrismaSimulatorAttemptRepository adapter tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Uses the hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free. Mirrors the pattern from PrismaOrderRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { PrismaSimulatorAttemptRepository } from "@/infra/repositories/PrismaSimulatorAttemptRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createSimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorAttemptError } from "@/ports/repositories/ISimulatorAttemptRepository";

/** Unwrap a Result whose error type is SimulatorAttemptError. */
function unwrap<T>(result: Result<T, SimulatorAttemptError>): T {
  if (!result.ok) throw new Error("Unexpected error: " + JSON.stringify(result.error));
  if (result.value === null) throw new Error("Unexpected null value");
  return result.value as T & object;
}

// ── Hand-rolled fake PrismaClient ───────────────────────────────────────

interface SimulatorAttemptRow {
  id: string;
  attemptId: string;
  userId: string;
  simulatorId: string;
  scenarioId: string;
  scenarioVersion: number;
  difficulty: string;
  mode: string;
  status: string;
  seed: string | null;
  score: number | null;
  scoreDimensions: Record<string, unknown> | null;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
}

interface SimulatorDecisionRow {
  id: string;
  attemptId: string;
  revision: number;
  decisionData: Record<string, unknown>;
  submittedAt: Date;
}

class FakePrismaClient {
  attemptRows: SimulatorAttemptRow[] = [];
  decisionRows: SimulatorDecisionRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;
  failNextDecision = false;
  private clock = 0;

  private tick(): Date {
    this.clock += 1;
    return new Date(this.clock);
  }

  simulatorAttempt = {
    create: async (args: {
      data: Omit<SimulatorAttemptRow, "startedAt" | "submittedAt" | "gradedAt">;
    }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.attemptRows.some((r) => r.id === args.data.id)) {
        throw new Error("unique constraint violation on id");
      }
      const row: SimulatorAttemptRow & { decisions: SimulatorDecisionRow[] } = {
        ...args.data,
        startedAt: this.tick(),
        submittedAt: null,
        gradedAt: null,
        decisions: [],
      };
      this.attemptRows.push(row);
      return row;
    },

    findUnique: async (args: { where: { id?: string; attemptId?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        const err = new Error("forced find error") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      if (args.where.id !== undefined) {
        const row = this.attemptRows.find((r) => r.id === args.where.id);
        if (!row) return null;
        return { ...row, decisions: this.decisionRows.filter((d) => d.attemptId === row.id) };
      }
      if (args.where.attemptId !== undefined) {
        const row = this.attemptRows.find((r) => r.attemptId === args.where.attemptId);
        if (!row) return null;
        return { ...row, decisions: this.decisionRows.filter((d) => d.attemptId === row.id) };
      }
      return null;
    },

    findMany: async (args: {
      where?: { userId?: string; simulatorId?: string; scenarioId?: string; status?: string };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.attemptRows];
      if (args.where?.userId) rows = rows.filter((r) => r.userId === args.where!.userId);
      if (args.where?.simulatorId)
        rows = rows.filter((r) => r.simulatorId === args.where!.simulatorId);
      if (args.where?.scenarioId)
        rows = rows.filter((r) => r.scenarioId === args.where!.scenarioId);
      if (args.where?.status) rows = rows.filter((r) => r.status === args.where!.status);
      return rows.map((r) => ({
        ...r,
        decisions: this.decisionRows.filter((d) => d.attemptId === r.id),
      }));
    },

    update: async (args: { where: { id: string }; data: Partial<SimulatorAttemptRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.attemptRows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { id: row.id });
      return { ...row, decisions: this.decisionRows.filter((d) => d.attemptId === row.id) };
    },
  };

  simulatorDecision = {
    create: async (args: { data: Omit<SimulatorDecisionRow, "submittedAt"> }) => {
      if (this.failNextDecision) {
        this.failNextDecision = false;
        throw new Error("forced decision error");
      }
      if (
        this.decisionRows.some(
          (r) => r.attemptId === args.data.attemptId && r.revision === args.data.revision,
        )
      ) {
        throw new Error("unique constraint violation on (attemptId, revision)");
      }
      const row: SimulatorDecisionRow = {
        ...args.data,
        submittedAt: this.tick(),
      };
      this.decisionRows.push(row);
      return row;
    },
  };
}

// ── Factory helpers ───────────────────────────────────────────────────────

function makeAttempt(overrides: Partial<SimulatorAttemptRow> = {}): SimulatorAttempt {
  const id = overrides.id ?? "patt_01";
  const base = createSimulatorAttempt({
    id,
    attemptId: overrides.attemptId ?? `ATT-${id}`,
    userId: overrides.userId ?? "user_p",
    simulatorId: (overrides.simulatorId ?? "bid-elevator") as SimulatorAttempt["simulatorId"],
    scenarioId: overrides.scenarioId ?? "pscen_01",
    scenarioVersion: 1,
    difficulty: "beginner",
    mode: "practice",
    seed: overrides.seed !== undefined ? overrides.seed : "PSEED123",
  });
  if (overrides.status && overrides.status !== "in_progress") {
    return { ...base, status: overrides.status as SimulatorAttempt["status"] } as SimulatorAttempt;
  }
  return base;
}

function makeDecision(
  attemptId: string,
  data: Record<string, unknown> = {},
  revision?: number,
): SimulatorDecision {
  const result = createSimulatorDecision({
    id: `pdec_${Date.now()}`,
    attemptId,
    decisionData: data,
    revision,
  });
  if (!result.ok) throw new Error("impossible: createSimulatorDecision always succeeds");
  return result.value;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("PrismaSimulatorAttemptRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaSimulatorAttemptRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaSimulatorAttemptRepository(db as never);
  });

  // ── create + findById ────────────────────────────────────────

  it("create persists an attempt and findById round-trips it", async () => {
    const attempt = makeAttempt({ id: "patt_c1", attemptId: "ATT-PC1" });
    const createResult = await repo.create(attempt);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    expect(createResult.value.status).toBe("in_progress");

    const found = await repo.findById("patt_c1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.id).toBe("patt_c1");
    expect(found.value?.attemptId).toBe("ATT-PC1");
    expect(found.value?.status).toBe("in_progress");
  });

  it("findById returns not_found for unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── findByAttemptId ──────────────────────────────────────────

  it("findByAttemptId locates an attempt by human-readable id", async () => {
    const attempt = makeAttempt({ id: "patt_a1", attemptId: "ATT-PA1B2" });
    await repo.create(attempt);

    const found = await repo.findByAttemptId("ATT-PA1B2");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.id).toBe("patt_a1");
  });

  it("findByAttemptId returns not_found for unknown attemptId", async () => {
    const result = await repo.findByAttemptId("ATT-GHOST");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── findByUserAndScenario ────────────────────────────────────

  it("findByUserAndScenario returns matching attempts", async () => {
    const a1 = makeAttempt({
      id: "patt_u1",
      userId: "paul",
      simulatorId: "str-triage",
      scenarioId: "ps1",
    });
    const a2 = makeAttempt({
      id: "patt_u2",
      userId: "paul",
      simulatorId: "str-triage",
      scenarioId: "ps1",
    });
    const a3 = makeAttempt({
      id: "patt_u3",
      userId: "quinn",
      simulatorId: "str-triage",
      scenarioId: "ps1",
    });
    await repo.create(a1);
    await repo.create(a2);
    await repo.create(a3);

    const result = await repo.findByUserAndScenario("paul", "str-triage", "ps1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });

  it("findByUserAndScenario with onlyInProgress=true filters by status", async () => {
    const a1 = makeAttempt({
      id: "patt_p1",
      userId: "rose",
      simulatorId: "campaign-builder",
      scenarioId: "ps2",
    });
    await repo.create(a1);
    await repo.updateStatus("patt_p1", "submitted");

    const a2 = makeAttempt({
      id: "patt_p2",
      userId: "rose",
      simulatorId: "campaign-builder",
      scenarioId: "ps2",
    });
    await repo.create(a2);

    const result = await repo.findByUserAndScenario("rose", "campaign-builder", "ps2", {
      onlyInProgress: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.id).toBe("patt_p2");
  });

  // ── addDecision ─────────────────────────────────────────────

  it("addDecision appends a decision to an in_progress attempt", async () => {
    const attempt = makeAttempt({ id: "patt_d1" });
    await repo.create(attempt);

    const decision = makeDecision("patt_d1", { action: "raise_bid", amount: 1.5 });
    const addResult = await repo.addDecision("patt_d1", decision);
    expect(addResult.ok).toBe(true);

    const found = await repo.findById("patt_d1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const foundAttempt = unwrap(found)!;
    expect(foundAttempt.decisions).toHaveLength(1);
    expect(foundAttempt.decisions[0]!.decisionData).toEqual({ action: "raise_bid", amount: 1.5 });
    expect(foundAttempt.decisions[0]!.revision).toBe(1);
  });

  it("addDecision returns not_found for unknown attempt", async () => {
    const decision = makeDecision("ghost_att", { action: "test" });
    const result = await repo.addDecision("ghost_att", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("addDecision returns already_submitted when attempt is submitted", async () => {
    const attempt = makeAttempt({ id: "patt_ds1" });
    await repo.create(attempt);
    await repo.updateStatus("patt_ds1", "submitted");

    const decision = makeDecision("patt_ds1", { action: "too_late" });
    const result = await repo.addDecision("patt_ds1", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_submitted");
  });

  it("addDecision returns already_graded when attempt is graded", async () => {
    const attempt = makeAttempt({ id: "patt_dg1" });
    await repo.create(attempt);
    await repo.updateStatus("patt_dg1", "submitted");
    await repo.updateStatus("patt_dg1", "graded", { score: 80, scoreDimensions: {} });

    const decision = makeDecision("patt_dg1", { action: "after_graded" });
    const result = await repo.addDecision("patt_dg1", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_graded");
  });

  // ── updateStatus ─────────────────────────────────────────────

  it("updateStatus transitions in_progress -> submitted", async () => {
    const attempt = makeAttempt({ id: "patt_us1" });
    await repo.create(attempt);

    const result = await repo.updateStatus("patt_us1", "submitted");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = unwrap(result);
    expect(updated.status).toBe("submitted");
    expect(updated.submittedAt).not.toBeNull();
  });

  it("updateStatus transitions submitted -> graded with score", async () => {
    const attempt = makeAttempt({ id: "patt_us2" });
    await repo.create(attempt);
    await repo.updateStatus("patt_us2", "submitted");

    const result = await repo.updateStatus("patt_us2", "graded", {
      score: 88,
      scoreDimensions: { direction: 90, magnitude: 86 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const graded = unwrap(result);
    expect(graded.status).toBe("graded");
    expect(graded.score).toBe(88);
    expect(graded.scoreDimensions).toEqual({ direction: 90, magnitude: 86 });
    expect(graded.gradedAt).not.toBeNull();
  });

  it("updateStatus returns not_found when attempt does not exist", async () => {
    const result = await repo.updateStatus("ghost", "submitted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("updateStatus returns invalid_status_transition for graded->submitted", async () => {
    const attempt = makeAttempt({ id: "patt_inv1" });
    await repo.create(attempt);
    await repo.updateStatus("patt_inv1", "submitted");
    await repo.updateStatus("patt_inv1", "graded", { score: 70, scoreDimensions: {} });

    const result = await repo.updateStatus("patt_inv1", "submitted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_status_transition");
  });

  // ── Error mapping ────────────────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeAttempt({ id: "patt_err1" }));
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

  it("updateStatus maps P2025 to not_found", async () => {
    const attempt = makeAttempt({ id: "patt_p2025" });
    await repo.create(attempt);
    db.failNextFind = true;

    const result = await repo.updateStatus("patt_p2025", "submitted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── mapRow handles null optionals ───────────────────────────

  it("mapRow handles null seed and score correctly", async () => {
    const attempt = makeAttempt({ id: "patt_null", seed: null, score: null });
    await repo.create(attempt);

    const found = await repo.findById("patt_null");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const nullAttempt = unwrap(found)!;
    expect(nullAttempt.seed).toBeNull();
    expect(nullAttempt.score).toBeNull();
    expect(nullAttempt.scoreDimensions).toBeNull();
    expect(nullAttempt.submittedAt).toBeNull();
    expect(nullAttempt.gradedAt).toBeNull();
  });

  // ── Multiple decisions with revisions ────────────────────────

  it("addDecision increments revision for second decision", async () => {
    const attempt = makeAttempt({ id: "patt_multi1" });
    await repo.create(attempt);

    // PrismaSimulatorAttemptRepository.addDecision uses the decision's own revision
    const d1 = makeDecision("patt_multi1", { step: 1 }, 1);
    const d2 = makeDecision("patt_multi1", { step: 2 }, 2);

    await repo.addDecision("patt_multi1", d1);
    await repo.addDecision("patt_multi1", d2);

    const found = await repo.findById("patt_multi1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const multiAttempt = unwrap(found)!;
    expect(multiAttempt.decisions).toHaveLength(2);
    expect(multiAttempt.decisions[0]!.revision).toBe(1);
    expect(multiAttempt.decisions[1]!.revision).toBe(2);
  });
});

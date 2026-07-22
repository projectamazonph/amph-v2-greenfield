/**
 * PrismaPricingTierRepository adapter test, STORY-011.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free. The fake implements the same surface the adapter
 * calls: `pricingTier.create`, `pricingTier.findUnique`,
 * `pricingTier.findFirst`, `pricingTier.findMany`,
 * `pricingTier.update`.
 *
 * Mirrors the `PrismaOrderRepository.test.ts` shape: per-method
 * `failNext*` toggles, P2002 (unique violation) and P2025 (record
 * not found) simulation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaPricingTierRepository } from "@/infra/repositories/PrismaPricingTierRepository";
import {
  createPricingTier,
  type PricingTier,
  type PricingTierStatus,
} from "@/domain/entities/PricingTier";
import { Money } from "@/domain/values/Money";

interface PricingTierRow {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: PricingTierRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;
  private clock = 0;

  /** Monotonic clock so rows created in the same tick still sort deterministically. */
  private tick(): Date {
    this.clock += 1;
    return new Date(this.clock);
  }

  /**
   * Simulate a Prisma `P2002` unique-constraint violation (we use
   * this to test the `slug_taken` mapping in `create`).
   */
  private prismaUniqueError(field: string): Error {
    const err = new Error(`Unique constraint failed on field ${field}`) as Error & {
      code: string;
    };
    err.code = "P2002";
    return err;
  }

  /**
   * Simulate a Prisma `P2025` record-not-found (we use this to test
   * the `not_found` mapping in `update`).
   */
  private prismaNotFoundError(): Error {
    const err = new Error("Record not found") as Error & { code: string };
    err.code = "P2025";
    return err;
  }

  pricingTier = {
    create: async (args: { data: Omit<PricingTierRow, "createdAt" | "updatedAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      // Enforce the `@@unique` on `slug` — matches the production
      // schema constraint.
      if (this.rows.some((r) => r.slug === args.data.slug)) {
        throw this.prismaUniqueError("slug");
      }
      const row: PricingTierRow = {
        ...args.data,
        createdAt: this.tick(),
        updatedAt: this.tick(),
      };
      this.rows.push(row);
      return row;
    },

    findUnique: async (args: { where: { id?: string; slug?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      if (args.where.id !== undefined) {
        return this.rows.find((r) => r.id === args.where.id) ?? null;
      }
      if (args.where.slug !== undefined) {
        return this.rows.find((r) => r.slug === args.where.slug) ?? null;
      }
      return null;
    },

    findFirst: async (args: {
      where: { slug?: string; status?: string; NOT?: { id: string } };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return (
        this.rows.find((r) => {
          if (args.where.slug !== undefined && r.slug !== args.where.slug) return false;
          if (args.where.status !== undefined && r.status !== args.where.status) return false;
          if (args.where.NOT?.id !== undefined && r.id === args.where.NOT.id) return false;
          return true;
        }) ?? null
      );
    },

    findMany: async (args: { where?: { status?: string | { not?: string } } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      const statusWhere = args.where?.status;
      if (typeof statusWhere === "string") {
        rows = rows.filter((r) => r.status === statusWhere);
      } else if (statusWhere && typeof statusWhere === "object" && "not" in statusWhere) {
        rows = rows.filter((r) => r.status !== statusWhere.not);
      }
      return rows;
    },

    update: async (args: { where: { id: string }; data: Partial<PricingTierRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        throw this.prismaNotFoundError();
      }
      Object.assign(row, args.data, { updatedAt: this.tick() });
      return row;
    },
  };
}

/**
 * Build a valid `PricingTier` domain object via the factory (so all
 * invariants are exercised end-to-end in each test).
 */
function makeTier(
  overrides: {
    id?: string;
    slug?: string;
    name?: string;
    priceMinor?: number;
    currency?: "PHP" | "USD";
    status?: PricingTierStatus;
    displayOrder?: number;
  } = {},
): PricingTier {
  const result = createPricingTier({
    id: overrides.id ?? "tier_01",
    slug: overrides.slug ?? "foundations",
    name: overrides.name ?? "Foundations",
    priceMinor: overrides.priceMinor ?? 299900,
    currency: overrides.currency ?? "PHP",
    status: overrides.status ?? "DRAFT",
    displayOrder: overrides.displayOrder ?? 0,
  });
  if (!result.ok) {
    throw new Error(`failed to build test tier: ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("PrismaPricingTierRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaPricingTierRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaPricingTierRepository(db as never);
  });

  // ── listAll ────────────────────────────────────────────────

  it("listAll returns all non-archived tiers sorted by displayOrder then createdAt", async () => {
    const older = makeTier({ id: "t1", slug: "foundations", displayOrder: 1, status: "DRAFT" });
    const newer = makeTier({ id: "t2", slug: "mastery", displayOrder: 2, status: "ACTIVE" });
    const freebie = makeTier({
      id: "t3",
      slug: "free",
      displayOrder: 0,
      priceMinor: 0,
      status: "ACTIVE",
    });
    // Seed in arbitrary order; the repo must sort.
    await repo.create(newer);
    await repo.create(freebie);
    await repo.create(older);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tiers = result.value;
    expect(tiers.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
    // Sanity: every tier carries its `Money` value.
    expect(tiers[0]?.price.isZero()).toBe(true);
    expect(tiers[1]?.price.minor).toBe(299900);
  });

  it("listAll excludes ARCHIVED tiers", async () => {
    await repo.create(makeTier({ id: "active-1", slug: "mastery", status: "ACTIVE" }));
    const toArchive = makeTier({ id: "archived-1", slug: "legacy", status: "ACTIVE" });
    await repo.create(toArchive);
    await repo.archive(toArchive.id);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.id)).toEqual(["active-1"]);
  });

  it("listAll includes DRAFT tiers (admin-visible)", async () => {
    await repo.create(makeTier({ id: "draft-1", slug: "foundations", status: "DRAFT" }));
    await repo.create(makeTier({ id: "active-1", slug: "mastery", status: "ACTIVE" }));

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.id).sort()).toEqual(["active-1", "draft-1"]);
  });

  it("listAll returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listAll();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── listActive ─────────────────────────────────────────────

  it("listActive returns only ACTIVE tiers, sorted", async () => {
    await repo.create(makeTier({ id: "d1", slug: "foundations", status: "DRAFT" }));
    await repo.create(makeTier({ id: "a1", slug: "mastery", status: "ACTIVE", displayOrder: 1 }));
    await repo.create(makeTier({ id: "a2", slug: "ultimate", status: "ACTIVE", displayOrder: 2 }));

    const result = await repo.listActive();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.id)).toEqual(["a1", "a2"]);
  });

  it("listActive excludes ARCHIVED tiers even when they were ACTIVE before", async () => {
    const t = makeTier({ id: "a1", slug: "mastery", status: "ACTIVE" });
    await repo.create(t);
    await repo.archive(t.id);

    const result = await repo.listActive();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it("listActive returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listActive();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── findById ───────────────────────────────────────────────

  it("findById round-trips a freshly created tier", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations", priceMinor: 149900, currency: "PHP" });
    await repo.create(tier);

    const found = await repo.findById("t1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.id).toBe("t1");
    expect(found.value?.price.minor).toBe(149900);
    expect(found.value?.price.currency).toBe("PHP");
    expect(found.value?.status).toBe("DRAFT");
  });

  it("findById returns null for an unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findById returns null for an archived tier", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);
    await repo.archive(tier.id);

    const result = await repo.findById("t1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findById returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── findBySlug ─────────────────────────────────────────────

  it("findBySlug locates a tier by its kebab-case slug", async () => {
    await repo.create(makeTier({ id: "t1", slug: "all-access", name: "All Access" }));
    const result = await repo.findBySlug("all-access");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.id).toBe("t1");
    expect(result.value?.name).toBe("All Access");
  });

  it("findBySlug returns null for an unknown slug", async () => {
    const result = await repo.findBySlug("nope");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findBySlug returns null for an archived tier", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);
    await repo.archive(tier.id);

    const result = await repo.findBySlug("foundations");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findBySlug is case-sensitive (slugs are normalized lowercase upstream)", async () => {
    await repo.create(makeTier({ id: "t1", slug: "foundations" }));
    const result = await repo.findBySlug("Foundations");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findBySlug returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findBySlug("foundations");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── create ─────────────────────────────────────────────────

  it("create persists a new tier and returns the hydrated entity", async () => {
    const tier = makeTier({
      id: "t1",
      slug: "ultimate",
      name: "Ultimate",
      priceMinor: 999900,
      status: "ACTIVE",
      displayOrder: 3,
    });
    const result = await repo.create(tier);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe("t1");
    expect(result.value.status).toBe("ACTIVE");
    expect(result.value.displayOrder).toBe(3);
    expect(result.value.price.minor).toBe(999900);
  });

  it("create maps Prisma P2002 (unique slug) to slug_taken", async () => {
    const first = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(first);

    const second = makeTier({ id: "t2", slug: "foundations" });
    const result = await repo.create(second);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("create preserves slug uniqueness even against an ARCHIVED tier", async () => {
    const old = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(old);
    await repo.archive(old.id);

    const reborn = makeTier({ id: "t2", slug: "foundations" });
    const result = await repo.create(reborn);
    // Production: `@@unique` on `slug` means this is a true
    // collision; archive is a soft-delete, not a slug release.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("create returns db_error when Prisma throws a non-P2002 error", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeTier());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── update ─────────────────────────────────────────────────

  it("update applies a price change and returns the rehydrated tier", async () => {
    const original = makeTier({ id: "t1", slug: "foundations", priceMinor: 100000 });
    await repo.create(original);

    // Build a new tier domain object representing the post-update
    // state. `Money` is immutable so we use the factory to construct
    // a fresh value object for the patched price.
    const patched = makeTier({
      id: original.id,
      slug: original.slug,
      name: original.name,
      priceMinor: 150000,
      currency: original.price.currency,
      status: original.status,
      displayOrder: original.displayOrder,
    });
    const update = await repo.update(patched);
    expect(update.ok).toBe(true);
    if (!update.ok) return;
    expect(update.value.price.minor).toBe(150000);

    // Round-trip via findById confirms the patch was persisted.
    const refetched = await repo.findById("t1");
    expect(refetched.ok).toBe(true);
    if (!refetched.ok) return;
    expect(refetched.value?.price.minor).toBe(150000);
  });

  it("update maps Prisma P2025 to not_found when the id doesn't exist", async () => {
    const ghost = makeTier({ id: "never-created", slug: "foundations" });
    const result = await repo.update(ghost);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("update pre-checks slug collision and returns slug_taken (matching the InMemory contract)", async () => {
    await repo.create(makeTier({ id: "t1", slug: "foundations" }));
    await repo.create(makeTier({ id: "t2", slug: "mastery" }));

    // Try to change t2's slug to "foundations" — must collide.
    const collision = makeTier({ id: "t2", slug: "foundations" });
    const result = await repo.update(collision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");

    // Sanity: t1's slug is still "foundations" and t2's slug is still
    // "mastery" — the pre-check must not have written anything.
    const t1 = await repo.findById("t1");
    const t2 = await repo.findById("t2");
    expect(t1.ok && t1.value?.slug).toBe("foundations");
    expect(t2.ok && t2.value?.slug).toBe("mastery");
  });

  it("update maps Prisma P2002 (race) to slug_taken as a defense-in-depth fallback", async () => {
    await repo.create(makeTier({ id: "t1", slug: "foundations" }));
    await repo.create(makeTier({ id: "t2", slug: "mastery" }));

    // Simulate a TOCTOU race: a concurrent transaction inserts a
    // colliding row between the adapter's slug-collision pre-check
    // (`findFirst`) and its `update`. We model this by monkey-
    // patching the fake's `update` to throw P2002 (Prisma's unique-
    // constraint error) only on this call. The pre-check sees no
    // collision, so the catch block is the one that maps the error.
    const realUpdate = db.pricingTier.update;
    db.pricingTier.update = (async (args: {
      where: { id: string };
      data: Partial<PricingTierRow>;
    }) => {
      db.pricingTier.update = realUpdate; // restore for future calls
      if (args.where.id === "t2" && args.data.slug === "foundations") {
        const err = new Error("Unique constraint failed on field slug") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      return realUpdate.call(db.pricingTier, args);
    }) as typeof db.pricingTier.update;

    const collision = makeTier({ id: "t2", slug: "foundations" });
    const result = await repo.update(collision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("update returns db_error when Prisma throws a non-mapped error", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);
    db.failNextUpdate = true;
    const result = await repo.update(tier);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── archive ────────────────────────────────────────────────

  it("archive soft-deletes a tier (status -> ARCHIVED) and hides it from listAll", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations", status: "ACTIVE" });
    await repo.create(tier);

    const result = await repo.archive("t1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("ARCHIVED");

    // Round-trip: listAll no longer surfaces it, findById returns null.
    const all = await repo.listAll();
    expect(all.ok && all.value.find((t) => t.id === "t1")).toBeUndefined();
    const byId = await repo.findById("t1");
    expect(byId.ok && byId.value).toBeNull();
  });

  it("archive is idempotent: archiving an already-archived tier returns it unchanged", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);

    const first = await repo.archive("t1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await repo.archive("t1");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.status).toBe("ARCHIVED");
    expect(second.value.id).toBe(first.value.id);
  });

  it("archive returns not_found for an unknown id", async () => {
    const result = await repo.archive("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("archive returns not_found when Prisma's update throws P2025 mid-flight", async () => {
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);
    // Force the second call (the update) to throw P2025. The fake's
    // update throws P2025 when the row is missing, so we simulate
    // a TOCTOU race by clearing the row between findUnique and
    // update. The fake's update path will throw P2025 because the
    // row disappears. The adapter must map this to not_found.
    const originalUpdate = db.pricingTier.update;
    db.pricingTier.update = (async (args: {
      where: { id: string };
      data: Partial<PricingTierRow>;
    }) => {
      // Delete the row before the update runs.
      db.rows = db.rows.filter((r) => r.id !== args.where.id);
      return originalUpdate.call(db.pricingTier, args);
    }) as typeof db.pricingTier.update;

    const result = await repo.archive("t1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("archive returns db_error when Prisma throws a non-P2025 error", async () => {
    // Seed via the repo so the findUnique in archive doesn't fail
    // with not_found, then force a generic error on the update call.
    const tier = makeTier({ id: "t1", slug: "foundations" });
    await repo.create(tier);
    db.failNextUpdate = true;
    const result = await repo.archive("t1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

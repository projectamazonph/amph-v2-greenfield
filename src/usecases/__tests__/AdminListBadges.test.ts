import { describe, it, expect, beforeEach } from "vitest";
import { AdminListBadges } from "../AdminListBadges";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { createBadge } from "@/domain/entities/Badge";

function makeBadge(overrides: Partial<Parameters<typeof createBadge>[0]> = {}) {
  const r = createBadge({
    slug: "first-quiz-pass",
    name: "First Quiz Pass",
    description: "Pass your first quiz",
    iconName: "Trophy",
    xpReward: 50,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminListBadges", () => {
  let repo: InMemoryBadgeRepository;
  let useCase: AdminListBadges;

  beforeEach(() => {
    repo = new InMemoryBadgeRepository();
    useCase = new AdminListBadges({ badgeRepo: repo });
  });

  it("lists all badges including archived", async () => {
    repo.seed(makeBadge({ slug: "first-quiz-pass" }));
    repo.seed(makeBadge({ slug: "5-day-streak", name: "5 Day Streak" }));
    await repo.archive("5-day-streak");

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
  });

  it("returns empty list when no badges", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(0);
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryBadgeRepository();
    badRepo.findAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "db down" },
    });
    const uc = new AdminListBadges({ badgeRepo: badRepo });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns badge fields correctly", async () => {
    repo.seed(makeBadge({ slug: "first-quiz-pass", xpReward: 100 }));
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const found = r.value.find((b) => b.slug === "first-quiz-pass");
    expect(found).toBeDefined();
    expect(found?.xpReward).toBe(100);
  });
});

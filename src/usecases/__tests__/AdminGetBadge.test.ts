import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetBadge } from "../AdminGetBadge";
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

describe("AdminGetBadge", () => {
  let repo: InMemoryBadgeRepository;
  let useCase: AdminGetBadge;

  beforeEach(() => {
    repo = new InMemoryBadgeRepository();
    useCase = new AdminGetBadge({ badgeRepo: repo });
  });

  it("returns the badge by slug", async () => {
    repo.seed(makeBadge({ slug: "5-day-streak", name: "5 Day Streak" }));
    const r = await useCase.execute("5-day-streak");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.slug).toBe("5-day-streak");
    expect(r.value.name).toBe("5 Day Streak");
  });

  it("returns not_found when badge does not exist", async () => {
    const r = await useCase.execute("first-quiz-pass");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryBadgeRepository();
    badRepo.findBySlug = async () => ({
      ok: false,
      error: { kind: "db_error", message: "db down" },
    });
    const uc = new AdminGetBadge({ badgeRepo: badRepo });
    const r = await uc.execute("first-quiz-pass");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

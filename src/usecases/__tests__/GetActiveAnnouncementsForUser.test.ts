/**
 * Tests for GetActiveAnnouncementsForUser — the banner's query path.
 *
 * P1-07 (P4 PR-A). Exercises every filter branch.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetActiveAnnouncementsForUser } from "../GetActiveAnnouncementsForUser";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementRepository";
import { InMemoryAnnouncementDismissalRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementDismissalRepository";
import { InMemoryAnnouncementOptOutRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementOptOutRepository";
import { FixedClock } from "@/ports/system/Clock";

const NOW = new Date("2026-09-15T12:00:00Z");
const clock = new FixedClock(NOW);

function makeUseCase() {
  const announcementRepo = new InMemoryAnnouncementRepository();
  const dismissalRepo = new InMemoryAnnouncementDismissalRepository();
  const optOutRepo = new InMemoryAnnouncementOptOutRepository();
  const useCase = new GetActiveAnnouncementsForUser({
    announcementRepo,
    dismissalRepo,
    optOutRepo,
    clock,
  });
  return { useCase, announcementRepo, dismissalRepo, optOutRepo };
}

function seed(
  announcementRepo: InMemoryAnnouncementRepository,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return announcementRepo._seed({
    id,
    title: `T-${id}`,
    body: "B",
    level: "INFO",
    isActive: true,
    startsAt: null,
    endsAt: null,
    dismissible: true,
    createdAt: NOW,
    updatedAt: NOW,
    createdById: "admin_1",
    updatedById: "admin_1",
    ...overrides,
  });
}

describe("GetActiveAnnouncementsForUser", () => {
  it("returns every active announcement for anonymous users", async () => {
    const { useCase, announcementRepo } = makeUseCase();
    seed(announcementRepo, "a1");
    seed(announcementRepo, "a2");
    const r = await useCase.execute({ userId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });

  it("hides inactive announcements", async () => {
    const { useCase, announcementRepo } = makeUseCase();
    seed(announcementRepo, "a1");
    seed(announcementRepo, "a2", { isActive: false });
    const r = await useCase.execute({ userId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((a) => a.id)).toEqual(["a1"]);
  });

  it("hides announcements outside the [startsAt, endsAt) window", async () => {
    const { useCase, announcementRepo } = makeUseCase();
    seed(announcementRepo, "future", {
      startsAt: new Date("2026-09-20T00:00:00Z"),
    });
    seed(announcementRepo, "expired", {
      startsAt: new Date("2026-09-01T00:00:00Z"),
      endsAt: new Date("2026-09-10T00:00:00Z"),
    });
    seed(announcementRepo, "live");
    const r = await useCase.execute({ userId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((a) => a.id)).toEqual(["live"]);
  });

  it("hides announcements the user has dismissed", async () => {
    const { useCase, announcementRepo, dismissalRepo } = makeUseCase();
    seed(announcementRepo, "a1");
    seed(announcementRepo, "a2");
    await dismissalRepo.dismiss("u1", "a1");
    const r = await useCase.execute({ userId: "u1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((a) => a.id)).toEqual(["a2"]);
  });

  it("returns empty array for opted-out users", async () => {
    const { useCase, announcementRepo, optOutRepo } = makeUseCase();
    seed(announcementRepo, "a1");
    seed(announcementRepo, "a2");
    await optOutRepo.setOptOut("u1", true);
    const r = await useCase.execute({ userId: "u1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });
});

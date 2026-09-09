/**
 * Tests for DismissAnnouncement.
 *
 * P1-07 (P4 PR-A). Idempotency is the only invariant.
 */

import { describe, it, expect } from "vitest";
import { DismissAnnouncement } from "../DismissAnnouncement";
import { InMemoryAnnouncementDismissalRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementDismissalRepository";

describe("DismissAnnouncement", () => {
  it("records a dismissal", async () => {
    const repo = new InMemoryAnnouncementDismissalRepository();
    const useCase = new DismissAnnouncement({ dismissalRepo: repo });
    const r = await useCase.execute({
      userId: "u1",
      announcementId: "a1",
    });
    expect(r.ok).toBe(true);
    const check = await repo.isDismissed("u1", "a1");
    expect(check.ok && check.value).toBe(true);
  });

  it("is idempotent", async () => {
    const repo = new InMemoryAnnouncementDismissalRepository();
    const useCase = new DismissAnnouncement({ dismissalRepo: repo });
    await useCase.execute({ userId: "u1", announcementId: "a1" });
    const second = await useCase.execute({ userId: "u1", announcementId: "a1" });
    expect(second.ok).toBe(true);
  });

  it("scopes by userId — different users dismiss independently", async () => {
    const repo = new InMemoryAnnouncementDismissalRepository();
    const useCase = new DismissAnnouncement({ dismissalRepo: repo });
    await useCase.execute({ userId: "u1", announcementId: "a1" });
    const u2 = await repo.isDismissed("u2", "a1");
    expect(u2.ok && u2.value).toBe(false);
  });
});

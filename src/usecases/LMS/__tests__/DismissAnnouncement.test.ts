/**
 * Unit tests for DismissAnnouncement use case.
 * P1-07: Site-wide announcement banner.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DismissAnnouncement } from "@/usecases/LMS/DismissAnnouncement";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/LMS/InMemoryAnnouncementRepository";
import { Announcement } from "@/domain/entities/LMS/Announcement";

describe("DismissAnnouncement", () => {
  let repo: InMemoryAnnouncementRepository;
  let useCase: DismissAnnouncement;

  beforeEach(() => {
    repo = new InMemoryAnnouncementRepository();
    useCase = new DismissAnnouncement(repo);
  });

  it("should track dismissal for authenticated user", async () => {
    const announcement: Announcement = {
      id: "ann_1",
      title: "Test",
      content: "Test content",
      severity: "info",
      isActive: true,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.create(announcement);

    const result = await useCase.execute({
      announcementId: "ann_1",
      userId: "user_1",
    });

    expect(result.ok).toBe(true);
    // Check that the dismissal was tracked
    const dismissals = repo.getDismissalsForUser("user_1");
    expect(dismissals).toContain("ann_1");
  });

  it("should track dismissal for unauthenticated user", async () => {
    const announcement: Announcement = {
      id: "ann_1",
      title: "Test",
      content: "Test content",
      severity: "info",
      isActive: true,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.create(announcement);

    const result = await useCase.execute({
      announcementId: "ann_1",
      userId: null,
    });

    expect(result.ok).toBe(true);
    // Check that the dismissal was tracked with null user
    const dismissals = repo.getDismissalsForUser(null);
    expect(dismissals).toContain("ann_1");
  });

  it("should handle non-existent announcement gracefully", async () => {
    const result = await useCase.execute({
      announcementId: "non_existent",
      userId: "user_1",
    });

    // Should still succeed (no-op for non-existent)
    expect(result.ok).toBe(true);
  });
});

/**
 * Unit tests for GetAnnouncements use case.
 * P1-07: Site-wide announcement banner.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetAnnouncements } from "@/usecases/LMS/GetAnnouncements";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/LMS/InMemoryAnnouncementRepository";
import { Announcement } from "@/domain/entities/LMS/Announcement";

describe("GetAnnouncements", () => {
  let repo: InMemoryAnnouncementRepository;
  let useCase: GetAnnouncements;

  beforeEach(() => {
    repo = new InMemoryAnnouncementRepository();
    useCase = new GetAnnouncements(repo);
  });

  it("should return empty array when no announcements exist", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([]);
  });

  it("should return only active announcements", async () => {
    const active: Announcement = {
      id: "ann_1",
      title: "Active Announcement",
      content: "This is active",
      severity: "info",
      isActive: true,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inactive: Announcement = {
      id: "ann_2",
      title: "Inactive Announcement",
      content: "This is inactive",
      severity: "info",
      isActive: false,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.create(active);
    await repo.create(inactive);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe("ann_1");
  });

  it("should return announcements sorted by createdAt descending", async () => {
    const older: Announcement = {
      id: "ann_1",
      title: "Older",
      content: "Older announcement",
      severity: "info",
      isActive: true,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const newer: Announcement = {
      id: "ann_2",
      title: "Newer",
      content: "Newer announcement",
      severity: "info",
      isActive: true,
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    };

    await repo.create(older);
    await repo.create(newer);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(2);
    expect(result.value[0].id).toBe("ann_2");
    expect(result.value[1].id).toBe("ann_1");
  });
});

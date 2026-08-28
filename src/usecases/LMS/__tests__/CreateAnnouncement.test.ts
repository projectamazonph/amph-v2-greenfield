/**
 * Unit tests for CreateAnnouncement use case.
 * P1-07: Site-wide announcement banner.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateAnnouncement } from "@/usecases/LMS/CreateAnnouncement";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/LMS/InMemoryAnnouncementRepository";
import type { CreateAnnouncementInput } from "@/usecases/LMS/CreateAnnouncement";

describe("CreateAnnouncement", () => {
  let repo: InMemoryAnnouncementRepository;
  let useCase: CreateAnnouncement;

  beforeEach(() => {
    repo = new InMemoryAnnouncementRepository();
    useCase = new CreateAnnouncement(repo);
  });

  it("should create announcement with default values", async () => {
    const input: CreateAnnouncementInput = {
      title: "Test Announcement",
      content: "Test content",
    };

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(result.value.title).toBe("Test Announcement");
    expect(result.value.content).toBe("Test content");
    expect(result.value.severity).toBe("info");
    expect(result.value.isActive).toBe(true);
    expect(result.value.startAt).toBeNull();
    expect(result.value.endAt).toBeNull();
  });

  it("should create announcement with all values specified", async () => {
    const input: CreateAnnouncementInput = {
      title: "Critical Alert",
      content: "System down",
      severity: "critical",
      isActive: false,
      startAt: new Date("2024-01-01"),
      endAt: new Date("2024-01-02"),
      createdById: "user_1",
    };

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(result.value.title).toBe("Critical Alert");
    expect(result.value.severity).toBe("critical");
    expect(result.value.isActive).toBe(false);
    expect(result.value.startAt).toEqual(new Date("2024-01-01"));
    expect(result.value.endAt).toEqual(new Date("2024-01-02"));
    expect(result.value.createdById).toBe("user_1");
  });

  it("should generate unique IDs for each announcement", async () => {
    const input1: CreateAnnouncementInput = {
      title: "First",
      content: "First content",
    };

    const input2: CreateAnnouncementInput = {
      title: "Second",
      content: "Second content",
    };

    const result1 = await useCase.execute(input1);
    const result2 = await useCase.execute(input2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result1.value.id).not.toBe(result2.value.id);
  });
});

import { describe, it, expect } from "vitest";
import { StreakService } from "@/domain/services/StreakService";

function makeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

describe("StreakService", () => {
  describe("stripTime", () => {
    it("strips time component to midnight UTC", () => {
      const d = new Date("2025-07-01T14:30:00Z");
      const stripped = StreakService.stripTime(d);
      expect(stripped.getUTCHours()).toBe(0);
      expect(stripped.getUTCMinutes()).toBe(0);
      expect(stripped.getUTCSeconds()).toBe(0);
      expect(stripped.getUTCFullYear()).toBe(2025);
      expect(stripped.getUTCMonth()).toBe(6); // July = index 6
      expect(stripped.getUTCDate()).toBe(1);
    });
  });

  describe("isConsecutiveDay", () => {
    it("returns true for consecutive calendar days", () => {
      const a = makeDate(2025, 7, 1);
      const b = makeDate(2025, 7, 2);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(true);
    });

    it("returns false for same day", () => {
      const a = makeDate(2025, 7, 1);
      const b = makeDate(2025, 7, 1);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(false);
    });

    it("returns false for two days apart", () => {
      const a = makeDate(2025, 7, 1);
      const b = makeDate(2025, 7, 3);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(false);
    });

    it("returns false when lastVisitDate is later", () => {
      const a = makeDate(2025, 7, 2);
      const b = makeDate(2025, 7, 1);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(false);
    });

    it("handles month boundary", () => {
      const a = makeDate(2025, 7, 31);
      const b = makeDate(2025, 8, 1);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(true);
    });

    it("handles year boundary", () => {
      const a = makeDate(2025, 12, 31);
      const b = makeDate(2026, 1, 1);
      expect(StreakService.isConsecutiveDay(a, b)).toBe(true);
    });
  });

  describe("computeStreakUpdate", () => {
    it("first visit ever → streak = 1", () => {
      const visitDate = makeDate(2025, 7, 1);
      const result = StreakService.computeStreakUpdate(
        null,
        0,
        0,
        visitDate,
      );
      expect(result.newStreak).toBe(1);
      expect(result.newLongest).toBe(1);
      expect(result.milestoneHit).toBeNull();
    });

    it("consecutive day → streak +1", () => {
      const lastVisit = makeDate(2025, 7, 1);
      const visitDate = makeDate(2025, 7, 2);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        3,
        5,
        visitDate,
      );
      expect(result.newStreak).toBe(4);
      expect(result.newLongest).toBe(5); // longest unchanged (4 < 5)
      expect(result.milestoneHit).toBeNull();
    });

    it("consecutive day → longest updated when streak exceeds it", () => {
      const lastVisit = makeDate(2025, 7, 1);
      const visitDate = makeDate(2025, 7, 2);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        5,
        5,
        visitDate,
      );
      expect(result.newStreak).toBe(6);
      expect(result.newLongest).toBe(6);
    });

    it("same day revisit → no change (streak stays same)", () => {
      const lastVisit = makeDate(2025, 7, 1);
      const visitDate = makeDate(2025, 7, 1);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        5,
        10,
        visitDate,
      );
      // Same day: newStreak = currentStreak (no increment)
      expect(result.newStreak).toBe(5);
      expect(result.newLongest).toBe(10);
      expect(result.milestoneHit).toBeNull();
    });

    it("miss a day → streak resets to 1", () => {
      const lastVisit = makeDate(2025, 7, 1);
      const visitDate = makeDate(2025, 7, 3);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        10,
        20,
        visitDate,
      );
      expect(result.newStreak).toBe(1);
      expect(result.newLongest).toBe(20); // longest preserved
    });

    it("hit 7-day milestone → milestoneHit returned", () => {
      const lastVisit = makeDate(2025, 6, 24); // day 6
      const visitDate = makeDate(2025, 6, 25); // day 7
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        6,
        6,
        visitDate,
      );
      expect(result.newStreak).toBe(7);
      expect(result.newLongest).toBe(7);
      expect(result.milestoneHit).not.toBeNull();
      expect(result.milestoneHit!.streak).toBe(7);
      expect(result.milestoneHit!.xpBonus).toBe(25);
    });

    it("hit 30-day milestone", () => {
      const lastVisit = makeDate(2025, 6, 1);
      const visitDate = makeDate(2025, 6, 2);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        29,
        29,
        visitDate,
      );
      expect(result.newStreak).toBe(30);
      expect(result.milestoneHit).not.toBeNull();
      expect(result.milestoneHit!.streak).toBe(30);
      expect(result.milestoneHit!.xpBonus).toBe(100);
    });

    it("hit 100-day milestone (Century)", () => {
      const lastVisit = makeDate(2025, 3, 3);
      const visitDate = makeDate(2025, 3, 4);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        99,
        99,
        visitDate,
      );
      expect(result.newStreak).toBe(100);
      expect(result.milestoneHit).not.toBeNull();
      expect(result.milestoneHit!.streak).toBe(100);
      expect(result.milestoneHit!.xpBonus).toBe(500);
    });

    it("no milestone on regular days", () => {
      const lastVisit = makeDate(2025, 7, 1);
      const visitDate = makeDate(2025, 7, 2);
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        2,
        5,
        visitDate,
      );
      expect(result.milestoneHit).toBeNull();
    });

    it("streak stays within day on very close visits (same calendar day)", () => {
      // Even if visit times differ, same calendar day = no increment
      const lastVisit = new Date("2025-07-01T08:00:00Z");
      const visitDate = new Date("2025-07-01T20:00:00Z");
      const result = StreakService.computeStreakUpdate(
        lastVisit,
        3,
        10,
        visitDate,
      );
      expect(result.newStreak).toBe(3); // no increment
    });
  });

  describe("getMilestones", () => {
    it("returns all 3 milestones with correct achieved status", () => {
      const milestones = StreakService.getMilestones(8);

      expect(milestones).toHaveLength(3);
      expect(milestones[0]).toMatchObject({ streak: 7, label: "7-Day Streak", xpBonus: 25, achieved: true });
      expect(milestones[1]).toMatchObject({ streak: 30, label: "30-Day Streak", xpBonus: 100, achieved: false });
      expect(milestones[2]).toMatchObject({ streak: 100, label: "Century", xpBonus: 500, achieved: false });
    });

    it("achieved is false for all when streak < 7", () => {
      const milestones = StreakService.getMilestones(3);
      expect(milestones.every((m) => !m.achieved)).toBe(true);
    });

    it("all achieved when streak >= 100", () => {
      const milestones = StreakService.getMilestones(150);
      expect(milestones.every((m) => m.achieved)).toBe(true);
    });
  });
});

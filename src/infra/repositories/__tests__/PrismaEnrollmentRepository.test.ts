/**
 * PrismaEnrollmentRepository.test.ts — audit hardening follow-up.
 *
 * No test coverage existed for this adapter before this change. Focused
 * on the new status validation added to mapRow() (mirrors
 * PrismaOrderRepository's PaymentStatus.isValid() guard) — a corrupt or
 * legacy status string must not silently hydrate an Enrollment that
 * bypasses access-control checks keyed on status.
 *
 * Hand-rolled in-memory PrismaClient fake, following the pattern
 * established by PrismaAuditLog.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaEnrollmentRepository } from "@/infra/repositories/PrismaEnrollmentRepository";

interface EnrollmentRow {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  source: string;
  couponCode: string | null;
  couponDiscount: number | null;
  createdAt: Date;
  completedLessonIds: string[];
  lastLessonId: string | null;
  progressPercent: number;
}

function makeRow(overrides: Partial<EnrollmentRow> = {}): EnrollmentRow {
  return {
    id: "enr_1",
    userId: "user_1",
    courseId: "course_1",
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date("2026-07-26T00:00:00Z"),
    completedLessonIds: [],
    lastLessonId: null,
    progressPercent: 0,
    ...overrides,
  };
}

class FakePrismaClient {
  rows: EnrollmentRow[] = [];

  enrollment = {
    findUnique: async (args: {
      where: { id?: string; userId_courseId?: { userId: string; courseId: string } };
    }) => {
      if (args.where.id) {
        return this.rows.find((r) => r.id === args.where.id) ?? null;
      }
      if (args.where.userId_courseId) {
        const { userId, courseId } = args.where.userId_courseId;
        return this.rows.find((r) => r.userId === userId && r.courseId === courseId) ?? null;
      }
      return null;
    },
    findMany: async (args: { where: { userId?: string; courseId?: string } }) => {
      return this.rows.filter((r) => {
        if (args.where.userId && r.userId !== args.where.userId) return false;
        if (args.where.courseId && r.courseId !== args.where.courseId) return false;
        return true;
      });
    },
  };
}

describe("PrismaEnrollmentRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaEnrollmentRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaEnrollmentRepository(db as never);
  });

  describe("happy path", () => {
    it("findById maps a valid row to an Enrollment", async () => {
      db.rows.push(makeRow());
      const result = await repo.findById("enr_1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("active");
      expect(result.value.source).toBe("direct");
    });

    it("findByUserIdAndCourseId returns the Enrollment when found", async () => {
      db.rows.push(makeRow());
      const result = await repo.findByUserIdAndCourseId("user_1", "course_1");
      expect(result?.id).toBe("enr_1");
    });

    it("findByUserIdAndCourseId returns null when not found", async () => {
      const result = await repo.findByUserIdAndCourseId("nobody", "nothing");
      expect(result).toBeNull();
    });

    it("findByUserId / findByCourseId map every matching row", async () => {
      db.rows.push(makeRow({ id: "enr_1", status: "active" }));
      db.rows.push(makeRow({ id: "enr_2", status: "cancelled" }));

      const byUser = await repo.findByUserId("user_1");
      expect(byUser.ok && byUser.value).toHaveLength(2);

      const byCourse = await repo.findByCourseId("course_1");
      expect(byCourse.ok && byCourse.value).toHaveLength(2);
    });
  });

  describe("corrupt status guard", () => {
    it("findById returns db_error for an invalid persisted status", async () => {
      db.rows.push(makeRow({ status: "not_a_real_status" }));
      const result = await repo.findById("enr_1");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("db_error");
    });

    it("findByUserIdAndCourseId fails closed (returns null) for an invalid persisted status", async () => {
      db.rows.push(makeRow({ status: "not_a_real_status" }));
      const result = await repo.findByUserIdAndCourseId("user_1", "course_1");
      expect(result).toBeNull();
    });

    it("findByUserId returns db_error if any row has an invalid status", async () => {
      db.rows.push(makeRow({ id: "enr_1", status: "active" }));
      db.rows.push(makeRow({ id: "enr_2", status: "bogus" }));
      const result = await repo.findByUserId("user_1");
      expect(result.ok).toBe(false);
    });
  });
});

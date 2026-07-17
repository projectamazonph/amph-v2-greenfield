import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createEnrollment,
  type Enrollment,
  type EnrollmentStatus,
  type EnrollmentSource,
} from "@/domain/entities/Enrollment";

describe("Enrollment", () => {
  describe("createEnrollment", () => {
    it("creates enrollment with status active by default", () => {
      const result = createEnrollment({
        id: "enroll_01",
        userId: "user_01",
        courseId: "course_01",
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      const enrollment = result.value;
      expect(enrollment.status).toBe("active");
      expect(enrollment.source).toBe("direct");
      expect(enrollment.couponCode).toBeNull();
      expect(enrollment.couponDiscount).toBeNull();
    });

    it("creates enrollment with all fields", () => {
      const result = createEnrollment({
        id: "enroll_01",
        userId: "user_01",
        courseId: "course_01",
        source: "affiliate",
        couponCode: "SAVE20",
        couponDiscount: 20,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      const enrollment = result.value;
      expect(enrollment.source).toBe("affiliate");
      expect(enrollment.couponCode).toBe("SAVE20");
      expect(enrollment.couponDiscount).toBe(20);
    });

    it("uses provided createdAt", () => {
      const createdAt = new Date("2025-01-01T00:00:00Z");
      const result = createEnrollment({
        id: "enroll_01",
        userId: "user_01",
        courseId: "course_01",
        createdAt,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.createdAt).toBe(createdAt);
    });

    it("rejects empty userId", () => {
      const result = createEnrollment({
        id: "enroll_01",
        userId: "",
        courseId: "course_01",
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_user_id");
    });

    it("rejects empty courseId", () => {
      const result = createEnrollment({
        id: "enroll_01",
        userId: "user_01",
        courseId: "",
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_course_id");
    });
  });

  describe("types are correctly exported", () => {
    it("EnrollmentStatus is a union type", () => {
      const statuses: EnrollmentStatus[] = ["active", "cancelled", "refunded", "expired"];
      expect(statuses).toHaveLength(4);
    });

    it("EnrollmentSource is a union type", () => {
      const sources: EnrollmentSource[] = ["direct", "affiliate", "simulator_trial"];
      expect(sources).toHaveLength(3);
    });

    it("Enrollment has all required fields", () => {
      const enrollment: Enrollment = {
        id: "e1",
        userId: "u1",
        courseId: "c1",
        status: "active",
        source: "direct",
        couponCode: null,
        couponDiscount: null,
        createdAt: new Date(),
      };
      expect(enrollment.status).toBe("active");
    });
  });
});

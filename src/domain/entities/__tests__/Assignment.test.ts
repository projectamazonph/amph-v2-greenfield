/**
 * Assignment entity tests (P1-02).
 *
 * Pins: create validation branches, the PENDING → SUBMITTED →
 * GRADED forward-only machine, assignee and grader guards, the
 * 0–100 integer grade gate, and the derived overdue flag.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createAssignment,
  gradeAssignment,
  isOverdue,
  submitAssignment,
  type Assignment,
} from "@/domain/entities/Assignment";

const DUE = new Date("2026-10-01T00:00:00Z");
const NOW = new Date("2026-09-11T00:00:00Z");

function mustCreate(overrides: Partial<Parameters<typeof createAssignment>[0]> = {}): Assignment {
  const result = createAssignment({
    id: "assign-1",
    courseId: "course-a",
    userId: "student-1",
    title: "Audit a listing",
    description: "Run the listing audit on your practice ASIN.",
    dueAt: DUE,
    createdById: "admin-1",
    ...overrides,
  });
  if (Result.isErr(result)) throw new Error("test setup failed");
  return result.value;
}

describe("createAssignment", () => {
  it("creates a PENDING assignment with empty progress fields", () => {
    const assignment = mustCreate();

    expect(assignment.status).toBe("PENDING");
    expect(assignment.submittedAt).toBeNull();
    expect(assignment.grade).toBeNull();
    expect(assignment.deletedAt).toBeNull();
  });

  it.each([
    ["invalid_course_id", { courseId: "  " }],
    ["invalid_user_id", { userId: "" }],
    ["invalid_title", { title: "   " }],
    ["invalid_description", { description: "" }],
    ["invalid_due_at", { dueAt: new Date(NaN) }],
  ])("rejects %s", (kind, overrides) => {
    const result = createAssignment({
      id: "assign-1",
      courseId: "course-a",
      userId: "student-1",
      title: "T",
      description: "D",
      dueAt: DUE,
      createdById: "admin-1",
      ...overrides,
    });

    expect(result).toEqual(Result.err({ kind }));
  });
});

describe("submitAssignment", () => {
  it("flips PENDING to SUBMITTED for the assignee", () => {
    const result = submitAssignment(mustCreate(), {
      submittedById: "student-1",
      submittedAt: NOW,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("SUBMITTED");
      expect(result.value.submittedAt).toEqual(NOW);
    }
  });

  it("accepts a late submission past the due date", () => {
    const late = new Date("2026-10-05T00:00:00Z");
    const result = submitAssignment(mustCreate(), {
      submittedById: "student-1",
      submittedAt: late,
    });

    expect(Result.isOk(result)).toBe(true);
  });

  it("rejects a stranger", () => {
    const result = submitAssignment(mustCreate(), {
      submittedById: "student-2",
      submittedAt: NOW,
    });

    expect(result).toEqual(Result.err({ kind: "not_assignee" }));
  });

  it("rejects a second submission", () => {
    const submitted = mustCreate();
    const first = submitAssignment(submitted, { submittedById: "student-1", submittedAt: NOW });
    if (Result.isErr(first)) throw new Error("setup failed");

    expect(
      submitAssignment(first.value, { submittedById: "student-1", submittedAt: NOW }),
    ).toEqual(Result.err({ kind: "invalid_status" }));
  });
});

describe("gradeAssignment", () => {
  function mustSubmit(): Assignment {
    const submitted = submitAssignment(mustCreate(), {
      submittedById: "student-1",
      submittedAt: NOW,
    });
    if (Result.isErr(submitted)) throw new Error("setup failed");
    return submitted.value;
  }

  it("closes a SUBMITTED assignment with grade and feedback", () => {
    const result = gradeAssignment(mustSubmit(), {
      graderId: "admin-1",
      grade: 85,
      feedback: "Solid audit, tighten the bullets.",
      gradedAt: NOW,
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("GRADED");
      expect(result.value.grade).toBe(85);
      expect(result.value.graderId).toBe("admin-1");
    }
  });

  it("accepts the boundary grades 0 and 100", () => {
    for (const grade of [0, 100]) {
      const result = gradeAssignment(mustSubmit(), {
        graderId: "admin-1",
        grade,
        feedback: null,
        gradedAt: NOW,
      });
      expect(Result.isOk(result)).toBe(true);
    }
  });

  it.each([[101], [-1], [85.5], [NaN]])("rejects grade %s", (grade) => {
    const result = gradeAssignment(mustSubmit(), {
      graderId: "admin-1",
      grade,
      feedback: null,
      gradedAt: NOW,
    });

    expect(result).toEqual(Result.err({ kind: "invalid_grade" }));
  });

  it("rejects grading an unsubmitted assignment", () => {
    const result = gradeAssignment(mustCreate(), {
      graderId: "admin-1",
      grade: 90,
      feedback: null,
      gradedAt: NOW,
    });

    expect(result).toEqual(Result.err({ kind: "invalid_status" }));
  });

  it("rejects a blank grader id", () => {
    const result = gradeAssignment(mustSubmit(), {
      graderId: "  ",
      grade: 90,
      feedback: null,
      gradedAt: NOW,
    });

    expect(result).toEqual(Result.err({ kind: "invalid_grader_id" }));
  });
});

describe("isOverdue", () => {
  it("flags a PENDING row past its due date", () => {
    expect(isOverdue(mustCreate(), new Date("2026-10-02T00:00:00Z"))).toBe(true);
  });

  it("does not flag before the due date", () => {
    expect(isOverdue(mustCreate(), NOW)).toBe(false);
  });

  it("does not flag submitted or graded rows", () => {
    const submitted = submitAssignment(mustCreate(), {
      submittedById: "student-1",
      submittedAt: new Date("2026-10-05T00:00:00Z"),
    });
    if (Result.isErr(submitted)) throw new Error("setup failed");

    const late = new Date("2026-11-01T00:00:00Z");
    expect(isOverdue(submitted.value, late)).toBe(false);
    const graded = gradeAssignment(submitted.value, {
      graderId: "admin-1",
      grade: 80,
      feedback: null,
      gradedAt: late,
    });
    if (Result.isErr(graded)) throw new Error("setup failed");
    expect(isOverdue(graded.value, late)).toBe(false);
  });
});

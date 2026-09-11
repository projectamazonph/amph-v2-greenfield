/**
 * adminAssignment.action tests (P1-02).
 *
 * Pins: the admin actor is injected, invalid input maps to
 * plain-spoken messages, and success redirects to the list page.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));

const { requireAdmin, createExecute, gradeExecute, redirect } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createExecute: vi.fn(),
  gradeExecute: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    createAssignment: { execute: createExecute },
    gradeAssignment: { execute: gradeExecute },
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import {
  createAssignmentAction,
  gradeAssignmentAction,
} from "@/app/actions/adminAssignment.action";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

beforeEach(() => {
  requireAdmin.mockReset();
  createExecute.mockReset();
  gradeExecute.mockReset();
  redirect.mockClear();
  requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
});

describe("createAssignmentAction", () => {
  it("injects the admin actor and redirects on success", async () => {
    createExecute.mockResolvedValue(Result.ok({ id: "assign-1" }));

    await expect(
      createAssignmentAction(
        null,
        form({
          courseId: "course-a",
          userEmail: "student@example.com",
          title: "Audit a listing",
          description: "Run the audit.",
          dueAt: "2026-10-01T09:00",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/assignments?saved=1");

    expect(createExecute).toHaveBeenCalledWith({
      actorId: "admin-1",
      courseId: "course-a",
      userEmail: "student@example.com",
      title: "Audit a listing",
      description: "Run the audit.",
      dueAt: new Date("2026-10-01T09:00"),
    });
  });

  it("maps an unknown assignee to a plain-spoken message", async () => {
    createExecute.mockResolvedValue(Result.err({ kind: "user_not_found" }));

    const result = await createAssignmentAction(
      null,
      form({
        courseId: "course-a",
        userEmail: "ghost@example.com",
        title: "T",
        description: "D",
        dueAt: "2026-10-01T09:00",
      }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "user_not_found",
      message: "No student uses that email.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("gradeAssignmentAction", () => {
  it("injects the admin actor and redirects on success", async () => {
    gradeExecute.mockResolvedValue(Result.ok({ id: "assign-1" }));

    await expect(
      gradeAssignmentAction(
        null,
        form({ assignmentId: "assign-1", grade: "85", feedback: "Good." }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/assignments?graded=1");

    expect(gradeExecute).toHaveBeenCalledWith({
      actorId: "admin-1",
      assignmentId: "assign-1",
      grade: 85,
      feedback: "Good.",
    });
  });

  it("maps an out-of-range grade to a plain-spoken message", async () => {
    gradeExecute.mockResolvedValue(Result.err({ kind: "invalid_grade" }));

    const result = await gradeAssignmentAction(
      null,
      form({ assignmentId: "assign-1", grade: "101", feedback: "" }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "invalid_grade",
      message: "Grade must be a whole number from 0 to 100.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

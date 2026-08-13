import { describe, expect, it } from "vitest";
import { studentErrorCopy } from "../studentErrorCopy";

describe("studentErrorCopy", () => {
  it("protects a student's work and gives a next step for transient failures", () => {
    expect(studentErrorCopy.quizSubmit).toContain("answers were not saved");
    expect(studentErrorCopy.simulatorRun).toContain("answers were not saved");
    expect(studentErrorCopy.simulatorGrade).toContain("work is still on this page");
    expect(studentErrorCopy.enrollment).toContain("account was not charged");
    expect(studentErrorCopy.rsvp).toContain("enrollment was not changed");
    expect(studentErrorCopy.recording).toContain("watch status is unchanged");
    expect(studentErrorCopy.exportData).toContain("account was not changed");
  });
});

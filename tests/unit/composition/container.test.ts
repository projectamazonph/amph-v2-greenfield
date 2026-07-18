/**
 * Container wiring tests — STORY-033 / STORY-036.
 *
 * Ensures RecordQuizAttempt and SimulatorRegistry are registered on both
 * production and test containers.
 */

import { describe, it, expect } from "vitest";
import { createQuiz } from "@/domain/entities/Quiz";
import { buildTestContainer } from "@/composition/container";

describe("container — recordQuizAttempt wiring", () => {
  it("test container exposes recordQuizAttempt", () => {
    const c = buildTestContainer();
    expect(c.recordQuizAttempt).toBeDefined();
    expect(typeof c.recordQuizAttempt.execute).toBe("function");
  });

  it("test container exposes xpEventRepo", () => {
    const c = buildTestContainer();
    expect(c.xpEventRepo).toBeDefined();
  });

  it("end-to-end: a passing attempt is scored and persisted via the test container", async () => {
    const c = buildTestContainer();

    // Seed a quiz
    const quizResult = createQuiz({
      id: "quiz-1",
      courseId: "course-1",
      title: "Test Quiz",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          questionText: "What is PPC?",
          options: [
            { id: "o1", optionText: "Pay Per Click", isCorrect: true },
            { id: "o2", optionText: "Post Paid", isCorrect: false },
          ],
        },
        {
          id: "q2",
          questionText: "What is CPC?",
          options: [
            { id: "o3", optionText: "Cost Per Click", isCorrect: true },
            { id: "o4", optionText: "Cost Per Conversion", isCorrect: false },
          ],
        },
      ],
    });
    if (!quizResult.ok) throw new Error("seed failed");
    c.quizRepo.seed(quizResult.value);

    const result = await c.recordQuizAttempt.execute({
      userId: "user-1",
      quizId: "quiz-1",
      answers: [
        { questionId: "q1", selectedOptionId: "o1" },
        { questionId: "q2", selectedOptionId: "o3" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBe(100);
    expect(result.value.passed).toBe(true);
    expect(result.value.attempt.status).toBe("completed");
  });
});

// ── IssueCertificate wiring (STORY-041) ────────────────────────

import { describe as certDescribe, it as certIt, expect as certExpect } from "vitest";
import { createCourse } from "@/domain/entities/Course";
import { createEnrollment } from "@/domain/entities/Enrollment";

certDescribe("container — issueCertificate wiring", () => {
  certIt("test container exposes issueCertificate", () => {
    const c = buildTestContainer();
    certExpect(c.issueCertificate).toBeDefined();
    certExpect(typeof c.issueCertificate.execute).toBe("function");
  });

  certIt("test container exposes certificateRepo and certificateHashGen", () => {
    const c = buildTestContainer();
    certExpect(c.certificateRepo).toBeDefined();
    certExpect(c.certificateHashGen).toBeDefined();
  });

  certIt("end-to-end: a completed enrollment produces a valid certificate via the test container", async () => {
    const c = buildTestContainer();

    // Seed a course
    const courseResult = createCourse({
      id: "course-1",
      slug: "intro-to-amazon",
      title: "Intro to Amazon",
      tagline: "Learn the basics",
      description: "A course about Amazon",
      priceMinor: 0,
      currency: "PHP",
      curriculum: { sections: [{ id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "VIDEO", content: "" }] }] },
      courseTier: "STARTER",
      previewLessonCount: 0,
    });
    if (!courseResult.ok) throw new Error("seed course failed");
    c.courseRepo.seed([courseResult.value]);

    // Seed an enrollment at 100% (status is "active" by default from factory)
    const enrollmentResult = createEnrollment({
      id: "enrollment-1",
      userId: "user-1",
      courseId: "course-1",
    });
    if (!enrollmentResult.ok) throw new Error("seed enrollment failed");
    const enrollment = enrollmentResult.value;
    enrollment.progressPercent = 100;
    await c.enrollmentRepo.create(enrollment);

    const result = await c.issueCertificate.execute({
      userId: "user-1",
      courseId: "course-1",
    });

    certExpect(result.ok).toBe(true);
    if (!result.ok) return;
    certExpect(result.value.certificate.userId).toBe("user-1");
    certExpect(result.value.certificate.courseId).toBe("course-1");
    certExpect(result.value.certificate.status).toBe("active");
    certExpect(result.value.certificate.verificationHash).toMatch(/^[0-9a-f]{64}$/);
    certExpect(result.value.isReissue).toBe(false);
  });
});

// ── RenderCertificatePdf wiring (STORY-042) ─────────────────

import { describe as pdfDescribe, it as pdfIt, expect as pdfExpect } from "vitest";

pdfDescribe("container — renderCertificatePdf wiring", () => {
  pdfIt("test container exposes renderCertificatePdf", () => {
    const c = buildTestContainer();
    pdfExpect(c.renderCertificatePdf).toBeDefined();
    pdfExpect(typeof c.renderCertificatePdf.execute).toBe("function");
  });

  pdfIt("test container exposes certificateRenderer", () => {
    const c = buildTestContainer();
    pdfExpect(c.certificateRenderer).toBeDefined();
  });

  pdfIt("end-to-end: a certificate renders to a PDF buffer via the test container", async () => {
    const c = buildTestContainer();

    // Seed a course
    const courseResult = createCourse({
      id: "course-pdf-1",
      slug: "pdf-test-course",
      title: "PDF Test Course",
      tagline: "Testing PDF rendering",
      description: "A course for testing the PDF renderer",
      priceMinor: 0,
      currency: "PHP",
      curriculum: { sections: [{ id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "VIDEO", content: "" }] }] },
      courseTier: "STARTER",
      previewLessonCount: 0,
    });
    if (!courseResult.ok) throw new Error("seed course failed");
    c.courseRepo.seed([courseResult.value]);

    // Seed a user via the in-memory user repo's create method
    await c.userRepo.create({
      id: "user-pdf-1",
      email: "pdf-test@example.com",
      passwordHash: "$argon2id$test",
      firstName: "Test",
      lastName: "User",
    });

    // Seed a certificate
    await c.certificateRepo.create({
      id: "cert-pdf-1",
      userId: "user-pdf-1",
      courseId: "course-pdf-1",
      verificationHash: "b".repeat(64),
      issuedAt: new Date("2026-07-01T00:00:00Z"),
      revokedAt: null,
      revokedReason: null,
      status: "active",
    });

    const result = await c.renderCertificatePdf.execute({ certificateId: "cert-pdf-1" });

    pdfExpect(result.ok).toBe(true);
    if (!result.ok) return;
    pdfExpect(Buffer.isBuffer(result.value.buffer)).toBe(true);
    pdfExpect(result.value.buffer.toString("utf8", 0, 5)).toBe("%PDF-");
    pdfExpect(result.value.verificationHash).toBe("b".repeat(64));
  });
});

// ── VerifyCertificate wiring (STORY-043) ────────────────────

import { describe as verifyDescribe, it as verifyIt, expect as verifyExpect } from "vitest";

verifyDescribe("container — verifyCertificate wiring", () => {
  verifyIt("test container exposes verifyCertificate", () => {
    const c = buildTestContainer();
    verifyExpect(c.verifyCertificate).toBeDefined();
    verifyExpect(typeof c.verifyCertificate.execute).toBe("function");
  });

  verifyIt("end-to-end: a valid hash returns cert + user + course via the test container", async () => {
    const c = buildTestContainer();

    // Seed a course
    const courseResult = createCourse({
      id: "course-verify-1",
      slug: "verify-test",
      title: "Verify Test Course",
      tagline: "Testing verification",
      description: "A course for testing verification",
      priceMinor: 0,
      currency: "PHP",
      curriculum: { sections: [{ id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "VIDEO", content: "" }] }] },
      courseTier: "STARTER",
      previewLessonCount: 0,
    });
    if (!courseResult.ok) throw new Error("seed course failed");
    c.courseRepo.seed([courseResult.value]);

    // Seed a user
    await c.userRepo.create({
      id: "user-verify-1",
      email: "verify-test@example.com",
      passwordHash: "$argon2id$test",
      firstName: "Verify",
      lastName: "User",
    });

    // Seed a cert
    await c.certificateRepo.create({
      id: "cert-verify-1",
      userId: "user-verify-1",
      courseId: "course-verify-1",
      verificationHash: "c".repeat(64),
      issuedAt: new Date("2026-07-01T00:00:00Z"),
      revokedAt: null,
      revokedReason: null,
      status: "active",
    });

    const result = await c.verifyCertificate.execute({ verificationHash: "c".repeat(64) });

    verifyExpect(result.ok).toBe(true);
    if (!result.ok) return;
    verifyExpect(result.value.certificate.id).toBe("cert-verify-1");
    verifyExpect(result.value.user.firstName).toBe("Verify");
    verifyExpect(result.value.user.lastName).toBe("User");
    verifyExpect(result.value.course.title).toBe("Verify Test Course");
  });

  verifyIt("end-to-end: an unknown hash returns certificate_not_found via the test container", async () => {
    const c = buildTestContainer();
    const result = await c.verifyCertificate.execute({ verificationHash: "d".repeat(64) });
    verifyExpect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });
});

// ── Simulator registry wiring (STORY-036) ──────────────────────

import { describe as simDescribe, it as simIt, expect as simExpect, beforeEach } from "vitest";

simDescribe("container — simulator registry wiring", () => {
  simIt("test container exposes simulatorRegistry", () => {
    const c = buildTestContainer();
    simExpect(c.simulatorRegistry).toBeDefined();
    simExpect(typeof c.simulatorRegistry.list).toBe("function");
    simExpect(typeof c.simulatorRegistry.get).toBe("function");
  });

  simIt("test container has all 4 simulator stubs registered", () => {
    const c = buildTestContainer();
    const simulators = c.simulatorRegistry.list();
    simExpect(simulators).toHaveLength(4);
    simExpect(c.simulatorRegistry.get("bid-elevator")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("str-triage")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("campaign-builder")).not.toBeNull();
    simExpect(c.simulatorRegistry.get("listing-audit")).not.toBeNull();
  });

  simIt("bid-elevator simulator is the real BidElevatorSimulator, not a stub", () => {
    const c = buildTestContainer();
    const bidElevator = c.simulatorRegistry.get("bid-elevator");
    simExpect(bidElevator).not.toBeNull();
    simExpect(bidElevator!.name).toBe("Bid Elevator");
    simExpect(bidElevator!.simulatorId).toBe("bid-elevator");
  });

  simIt("str-triage simulator is the real StrTriageSimulator, not a stub", () => {
    const c = buildTestContainer();
    const strTriage = c.simulatorRegistry.get("str-triage");
    simExpect(strTriage).not.toBeNull();
    simExpect(strTriage!.name).toBe("STR Triage");
    simExpect(strTriage!.simulatorId).toBe("str-triage");
  });

  simIt("campaign-builder simulator is the real CampaignBuilderSimulator, not a stub", () => {
    const c = buildTestContainer();
    const cb = c.simulatorRegistry.get("campaign-builder");
    simExpect(cb).not.toBeNull();
    simExpect(cb!.name).toBe("Campaign Builder");
    simExpect(cb!.simulatorId).toBe("campaign-builder");
  });

  simIt("listing-audit simulator is the real ListingAuditSimulator, not a stub", () => {
    const c = buildTestContainer();
    const la = c.simulatorRegistry.get("listing-audit");
    simExpect(la).not.toBeNull();
    simExpect(la!.name).toBe("Listing Audit + Keyword Research");
    simExpect(la!.simulatorId).toBe("listing-audit");
  });
});

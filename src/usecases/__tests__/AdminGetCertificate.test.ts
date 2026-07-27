import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetCertificate } from "../AdminGetCertificate";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { Result } from "@/domain/shared/Result";
import { createCertificate, type Certificate } from "@/domain/entities/Certificate";
import { createCourse, type Course } from "@/domain/entities/Course";

// ── Test fixtures ──────────────────────────────────────────────────────────

// Seed the InMemoryUserRepository with the minimum surface `create` needs.
// The repo applies default role/subscriptionTier/etc. on create; we just
// need id/email/passwordHash/firstName/lastName to land a row.
async function seedUser(
  userRepo: InMemoryUserRepository,
  id: string,
  firstName: string,
): Promise<void> {
  await userRepo.create({
    id,
    email: `${id}@test.example.com`,
    passwordHash: "placeholder",
    firstName,
    lastName: "User",
  });
}

function makeCourse(id: string, title: string): Course {
  const r = createCourse({
    id,
    slug: id,
    title,
    tagline: "t",
    description: "d",
    priceMinor: 0,
    currency: "PHP",
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    courseTier: "PREVIEW",
    previewLessonCount: 1,
    curriculum: {
      sections: [
        {
          id: `${id}_s1`,
          title: "Section 1",
          lessons: [
            { id: `${id}_l1`, title: "Lesson 1", type: "TEXT", content: { body: "hi" } as never },
          ],
        },
      ],
    },
  });
  if (!r.ok) throw new Error("makeCourse failed: " + JSON.stringify(r.error));
  return r.value;
}

function makeCert(id: string, userId: string, courseId: string): Certificate {
  const r = createCertificate({
    id,
    userId,
    courseId,
    // 64-char hex hash (sha256-shaped) — required by createCertificate
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("makeCert failed: " + JSON.stringify(r.error));
  return r.value;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AdminGetCertificate", () => {
  let certificateRepo: InMemoryCertificateRepository;
  let userRepo: InMemoryUserRepository;
  let courseRepo: InMemoryCourseRepository;

  beforeEach(() => {
    certificateRepo = new InMemoryCertificateRepository();
    userRepo = new InMemoryUserRepository();
    courseRepo = new InMemoryCourseRepository();
  });

  it("returns the certificate joined with user and course", async () => {
    const c = makeCourse("c1", "Course 1");
    const cert = makeCert("cert-1", "u1", "c1");
    await courseRepo.create(c);
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(cert);

    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificate.id).toBe("cert-1");
    expect(r.value.user.id).toBe("u1");
    expect(r.value.user.firstName).toBe("Alice");
    expect(r.value.course.id).toBe("c1");
    expect(r.value.course.title).toBe("Course 1");
  });

  it("returns certificate_not_found when no certificate exists with that id", async () => {
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("certificate_not_found");
  });

  it("returns user_not_found when the cert's user is missing (data-integrity)", async () => {
    // Cert references user u1, but u1 doesn't exist in the user repo.
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await certificateRepo.create(makeCert("cert-1", "missing_user", "c1"));
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_not_found");
  });

  it("returns course_not_found when the cert's course is missing (data-integrity)", async () => {
    // Cert references course c1, but c1 doesn't exist in the course repo.
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "missing_course"));
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_not_found");
  });

  it("returns user_error when userRepo fails with a non-not_found db_error", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1"));
    userRepo.findById = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_error");
  });

  it("returns course_error when courseRepo fails with a non-not_found db_error", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1"));
    courseRepo.findById = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_error");
  });

  it("propagates db_error from the certificate repo", async () => {
    certificateRepo.findById = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminGetCertificate({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ certificateId: "cert-1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

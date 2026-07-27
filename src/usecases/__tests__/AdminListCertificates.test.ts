import { describe, it, expect, beforeEach } from "vitest";
import { AdminListCertificates } from "../AdminListCertificates";
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

function makeCert(
  id: string,
  userId: string,
  courseId: string,
  status: "active" | "revoked" = "active",
): Certificate {
  const r = createCertificate({
    id,
    userId,
    courseId,
    // 64-char hex hash (sha256-shaped) — required by createCertificate
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("makeCert failed: " + JSON.stringify(r.error));
  if (status === "revoked") {
    return {
      ...r.value,
      status: "revoked",
      revokedAt: new Date("2026-01-02T00:00:00Z"),
      revokedReason: "test",
    };
  }
  return r.value;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AdminListCertificates", () => {
  let certificateRepo: InMemoryCertificateRepository;
  let userRepo: InMemoryUserRepository;
  let courseRepo: InMemoryCourseRepository;

  beforeEach(() => {
    certificateRepo = new InMemoryCertificateRepository();
    userRepo = new InMemoryUserRepository();
    courseRepo = new InMemoryCourseRepository();
  });

  it("returns all certificates when no filter is set", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await courseRepo.create(makeCourse("c2", "Course 2"));
    await seedUser(userRepo, "u1", "Alice");
    await seedUser(userRepo, "u2", "Bob");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1", "active"));
    await certificateRepo.create(makeCert("cert-2", "u2", "c2", "revoked"));

    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(2);
    expect(r.value.users.size).toBe(2);
    expect(r.value.courses.size).toBe(2);
    expect(r.value.users.get("u1")?.firstName).toBe("Alice");
    expect(r.value.users.get("u2")?.firstName).toBe("Bob");
    expect(r.value.courses.get("c1")?.title).toBe("Course 1");
    expect(r.value.courses.get("c2")?.title).toBe("Course 2");
  });

  it("filters to only active certificates when status='active'", async () => {
    // 2 users × 1 course, mixed status — uses distinct (userId,courseId)
    // pairs to satisfy the in-memory repo's UNIQUE (userId, courseId) check.
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await seedUser(userRepo, "u1", "Alice");
    await seedUser(userRepo, "u2", "Bob");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1", "active"));
    await certificateRepo.create(makeCert("cert-2", "u2", "c1", "revoked"));

    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ status: "active" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(1);
    expect(r.value.certificates[0]?.id).toBe("cert-1");
    expect(r.value.certificates[0]?.status).toBe("active");
  });

  it("filters to only revoked certificates when status='revoked'", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await seedUser(userRepo, "u1", "Alice");
    await seedUser(userRepo, "u2", "Bob");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1", "active"));
    await certificateRepo.create(makeCert("cert-2", "u2", "c1", "revoked"));

    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({ status: "revoked" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(1);
    expect(r.value.certificates[0]?.id).toBe("cert-2");
    expect(r.value.certificates[0]?.status).toBe("revoked");
  });

  it("returns empty list and empty maps when no certificates exist", async () => {
    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(0);
    expect(r.value.users.size).toBe(0);
    expect(r.value.courses.size).toBe(0);
  });

  // STORY-092 acceptance criterion: "(for AdminListCertificates) correct
  // Map hydration with duplicate userIds/courseIds collapsed to single lookups"
  it("collapses duplicate userIds into a single Map entry", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await courseRepo.create(makeCourse("c2", "Course 2"));
    // Same user has 2 certificates across 2 courses
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1", "active"));
    await certificateRepo.create(makeCert("cert-2", "u1", "c2", "active"));

    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(2);
    expect(r.value.users.size).toBe(1); // collapsed
    expect(r.value.courses.size).toBe(2);
  });

  it("collapses duplicate courseIds into a single Map entry", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    // 2 users, same course
    await seedUser(userRepo, "u1", "Alice");
    await seedUser(userRepo, "u2", "Bob");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1", "active"));
    await certificateRepo.create(makeCert("cert-2", "u2", "c1", "active"));

    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.certificates).toHaveLength(2);
    expect(r.value.users.size).toBe(2);
    expect(r.value.courses.size).toBe(1); // collapsed
  });

  it("propagates db_error from the certificate repo", async () => {
    certificateRepo.listAll = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns course_error if a referenced course is missing in the repo", async () => {
    // Cert references course c1, but c1 doesn't exist in the course repo.
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "missing_course"));
    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_error");
  });

  it("returns user_error if a referenced user is missing in the repo", async () => {
    // Cert references user u1, but u1 doesn't exist in the user repo.
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await certificateRepo.create(makeCert("cert-1", "missing_user", "c1"));
    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_error");
  });

  it("returns db_error from userRepo if it fails to look up a user", async () => {
    await courseRepo.create(makeCourse("c1", "Course 1"));
    await seedUser(userRepo, "u1", "Alice");
    await certificateRepo.create(makeCert("cert-1", "u1", "c1"));
    // Force userRepo.findById to return a non-not_found db_error
    userRepo.findById = async () => Result.err({ kind: "db_error", message: "down" });
    const uc = new AdminListCertificates({ certificateRepo, userRepo, courseRepo });
    const r = await uc.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_error");
  });
});

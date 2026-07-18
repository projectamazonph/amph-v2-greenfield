/**
 * VerifyCertificate — public certificate lookup by verification hash.
 *
 * STORY-043: /certificates/[hash] public view + /pdf route.
 *
 * Returns the certificate (active or revoked) plus the associated user
 * and course. This is what the public HTML view and the PDF download
 * route both call. Different from RenderCertificatePdf because:
 *  - HTML view needs structured data, not a Buffer
 *  - HTML view includes revoked certs; PDF already does
 *  - Hash format is validated up front to save a DB roundtrip
 *
 * Flow:
 *  1. Validate hash format (64-char hex) → invalid_hash_format
 *  2. Find certificate by hash → certificate_not_found
 *  3. Find user → user_not_found (defensive — data integrity issue)
 *  4. Find course → course_not_found (defensive — data integrity issue)
 *  5. Return { certificate, user, course }
 */

import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";

// ── Input / Output types ───────────────────────────────────────────────────

export interface VerifyCertificateInput {
  verificationHash: string;
}

export type VerifyCertificateError =
  | { kind: "certificate_not_found" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "invalid_hash_format" }
  | { kind: "db_error"; message: string };

export type VerifyCertificateResult = Result<
  {
    certificate: Certificate;
    user: { firstName: string; lastName: string };
    course: { title: string; tagline: string };
  },
  VerifyCertificateError
>;

// ── Constants ──────────────────────────────────────────────────────────────

const HASH_REGEX = /^[0-9a-f]{64}$/;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface VerifyCertificateDeps {
  certificateRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class VerifyCertificate {
  constructor(private readonly deps: VerifyCertificateDeps) {}

  async execute(input: VerifyCertificateInput): Promise<VerifyCertificateResult> {
    // ── 1. Hash format check ───────────────────────────────────
    if (!HASH_REGEX.test(input.verificationHash)) {
      return Result.err({ kind: "invalid_hash_format" });
    }

    // ── 2. Find certificate by hash ───────────────────────────
    const certResult = await this.deps.certificateRepo.findByVerificationHash(
      input.verificationHash,
    );
    if (!certResult.ok) {
      if (certResult.error.kind === "not_found") {
        return Result.err({ kind: "certificate_not_found" });
      }
      return Result.err({ kind: "db_error", message: certResult.error.message });
    }
    const certificate = certResult.value;
    if (!certificate) {
      return Result.err({ kind: "certificate_not_found" });
    }

    // ── 3. Find user ───────────────────────────────────────────
    const userResult = await this.deps.userRepo.findById(certificate.userId);
    if (!userResult.ok) {
      if (userResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      if (userResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: userResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch user" });
    }
    const user = userResult.value;

    // ── 4. Find course ─────────────────────────────────────────
    const courseResult = await this.deps.courseRepo.findById(certificate.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      if (courseResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: courseResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch course" });
    }
    const course = courseResult.value;

    return Result.ok({
      certificate,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
      },
      course: {
        title: course.title,
        tagline: course.tagline,
      },
    });
  }
}

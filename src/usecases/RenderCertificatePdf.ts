/**
 * RenderCertificatePdf — render a Certificate as a PDF buffer.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * Flow:
 *  1. Find certificate by id → certificate_not_found
 *  2. Find user → user_not_found
 *  3. Find course → course_not_found
 *  4. Call renderer.render({ certificate, user, course }) → render_error on throw
 *  5. Return { buffer, verificationHash }
 *
 * Note: this use case does NOT gate on cert status. The PDF is a
 * historical artifact — a revoked cert still renders. The public view
 * (STORY-043) decides whether to overlay a "REVOKED" badge.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";

// ── Input / Output types ───────────────────────────────────────────────────

export interface RenderCertificatePdfInput {
  certificateId: string;
}

export type RenderCertificatePdfError =
  | { kind: "certificate_not_found" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "render_error"; message: string }
  | { kind: "db_error"; message: string };

export type RenderCertificatePdfResult = Result<
  { buffer: Buffer; verificationHash: string },
  RenderCertificatePdfError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface RenderCertificatePdfDeps {
  certificateRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  renderer: CertificateRenderer;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class RenderCertificatePdf {
  constructor(private readonly deps: RenderCertificatePdfDeps) {}

  async execute(input: RenderCertificatePdfInput): Promise<RenderCertificatePdfResult> {
    // ── 1. Certificate ────────────────────────────────────────
    const certResult = await this.deps.certificateRepo.findById(input.certificateId);
    if (!certResult.ok) {
      if (certResult.error.kind === "not_found") {
        return Result.err({ kind: "certificate_not_found" });
      }
      if (certResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: certResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch certificate" });
    }
    const certificate = certResult.value;
    if (!certificate) {
      return Result.err({ kind: "certificate_not_found" });
    }

    // ── 2. User ────────────────────────────────────────────────
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

    // ── 3. Course ──────────────────────────────────────────────
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

    // ── 4. Render ──────────────────────────────────────────────
    let buffer: Buffer;
    try {
      buffer = await this.deps.renderer.render({
        certificate,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        course: {
          title: course.title,
          tagline: course.tagline,
        },
      });
    } catch (err: unknown) {
      return Result.err({
        kind: "render_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return Result.ok({ buffer, verificationHash: certificate.verificationHash });
  }
}

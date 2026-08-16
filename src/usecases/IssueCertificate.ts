/**
 * IssueCertificate — issue a certificate of course completion to a user.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * Flow:
 *  1. Find course → course_not_found
 *  2. Find active enrollment for (user, course) → enrollment_not_found
 *  3. Verify progressPercent === 100 → course_not_completed
 *  4. Verify no active certificate already exists → already_issued
 *  5. Generate ULID cert id, generate verification hash
 *  6. Build the certificate via createCertificate
 *  7. Persist via certificateRepo.create
 *  8. Return the certificate
 *
 * Triggered manually in this story. STORY-044 (revocation flow) will
 * also handle re-issuance and the auto-issuance trigger from
 * `markLessonComplete`.
 */

import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import { createCertificate } from "@/domain/entities/Certificate";
import { buildAppUrl } from "@/domain/shared/AppUrl";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { CertificateEmailRenderer } from "@/ports/email/CertificateEmailRenderer";
import type { Logger } from "@/ports/observability/Logger";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";
import { interpolateEmailTemplate } from "@/domain/entities/EmailTemplate";

// ── Input / Output types ───────────────────────────────────────────────────

export interface IssueCertificateInput {
  userId: string;
  courseId: string;
}

export type IssueCertificateError =
  | { kind: "course_not_found" }
  | { kind: "enrollment_not_found" }
  | { kind: "course_not_completed"; progressPercent: number }
  | { kind: "enrollment_not_active"; status: string }
  | { kind: "already_issued"; existingCertificateId: string }
  | { kind: "db_error"; message: string };

export type IssueCertificateResult = Result<
  { certificate: Certificate; isReissue: false },
  IssueCertificateError
>;

// ── Dependencies ────────────────────────────────────────────────────────────

export interface IssueCertificateDeps {
  enrollmentRepo: IEnrollmentRepository;
  courseRepo: CourseRepository;
  certificateRepo: ICertificateRepository;
  hashGen: CertificateHashGenerator;
  idGen: IdGenerator;
  clock: Clock;
  userRepo: UserRepository;
  emailSender: EmailSender;
  certificateEmailRenderer: CertificateEmailRenderer;
  logger: Logger;
  emailTemplateRepo: IEmailTemplateRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class IssueCertificate {
  constructor(private readonly deps: IssueCertificateDeps) {}

  async execute(input: IssueCertificateInput): Promise<IssueCertificateResult> {
    // ── 1. Course must exist ───────────────────────────────────
    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch course" });
    }
    const course = courseResult.value;

    // ── 2. Enrollment must exist ───────────────────────────────
    const enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );
    if (enrollment === null) {
      return Result.err({ kind: "enrollment_not_found" });
    }

    // ── 3. Enrollment must be active ──────────────────────────
    if (enrollment.status !== "active") {
      return Result.err({ kind: "enrollment_not_active", status: enrollment.status });
    }

    // ── 4. Course must be completed (100%) ────────────────────
    if (enrollment.progressPercent < 100) {
      return Result.err({
        kind: "course_not_completed",
        progressPercent: enrollment.progressPercent,
      });
    }

    // ── 5. No active certificate already exists ───────────────
    const existingResult = await this.deps.certificateRepo.findByUserId(input.userId);
    if (!existingResult.ok) {
      return this.mapRepoError(existingResult.error, "Failed to check existing certificates");
    }
    const existing = existingResult.value.find((c) => c.courseId === input.courseId);
    if (existing) {
      return Result.err({ kind: "already_issued", existingCertificateId: existing.id });
    }

    // ── 6. Build the certificate ──────────────────────────────
    const id = this.deps.idGen.newId();
    const issuedAt = this.deps.clock.now();
    const verificationHash = this.deps.hashGen.hash({
      id,
      userId: input.userId,
      courseId: input.courseId,
      issuedAt,
    });

    const certResult = createCertificate({
      id,
      userId: input.userId,
      courseId: input.courseId,
      verificationHash,
      issuedAt,
    });
    if (!certResult.ok) {
      // createCertificate can fail on a malformed hash. Should not happen
      // because our hash generators always produce 64-char hex, but defend
      // anyway.
      return Result.err({
        kind: "db_error",
        message: `Certificate validation failed: ${certResult.error.kind}`,
      });
    }

    // ── 7. Persist ────────────────────────────────────────────
    const persistResult = await this.deps.certificateRepo.create(certResult.value);
    if (!persistResult.ok) {
      return this.mapRepoError(persistResult.error, "Failed to persist certificate");
    }

    // ── 8. Send the certificate-issued email (best-effort) ────
    await this.sendCertificateEmail(input.userId, course.title, persistResult.value);

    return Result.ok({ certificate: persistResult.value, isReissue: false });
  }

  private async sendCertificateEmail(
    userId: string,
    courseTitle: string,
    certificate: Certificate,
  ): Promise<void> {
    const userResult = await this.deps.userRepo.findById(userId);
    if (!userResult.ok) {
      this.deps.logger.warn("issue_certificate.email_skipped_user_lookup_failed", {
        userId,
        certificateId: certificate.id,
      });
      return;
    }
    const user = userResult.value;
    const verifyUrl = buildAppUrl(`/certificates/${certificate.verificationHash}`);

    const templateResult = await this.deps.emailTemplateRepo.findByType("certificate");
    const template = templateResult.ok ? templateResult.value : null;
    const resolvedTemplate = template
      ? interpolateEmailTemplate(template, {
          firstName: user.firstName,
          courseTitle,
          verificationHash: certificate.verificationHash,
          verifyUrl,
        })
      : null;
    const sendResult = await this.deps.emailSender.send({
      to: user.email,
      subject: resolvedTemplate?.subject ?? `Certificate earned — ${courseTitle}`,
      react: this.deps.certificateEmailRenderer.render({
        firstName: user.firstName,
        courseTitle,
        verificationHash: certificate.verificationHash,
        verifyUrl,
        headlineOverride: resolvedTemplate?.headlineOverride,
        introBodyOverride: resolvedTemplate?.introBodyOverride,
        ctaLabelOverride: resolvedTemplate?.ctaLabelOverride,
      }),
    });
    if (!sendResult.ok) {
      this.deps.logger.warn("issue_certificate.email_send_failed", {
        userId,
        certificateId: certificate.id,
        error: sendResult.error,
      });
    }
  }

  private mapRepoError(
    err: CertificateRepositoryError,
    fallbackMsg: string,
  ): Result<never, IssueCertificateError> {
    if (err.kind === "db_error") {
      return Result.err({ kind: "db_error", message: err.message });
    }
    return Result.err({ kind: "db_error", message: fallbackMsg });
  }
}

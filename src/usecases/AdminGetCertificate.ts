/**
 * AdminGetCertificate — single-record version of AdminListCertificates.
 *
 * STORY-092 (US-008). Mirrors AdminGetPayment: load the certificate
 * by id, then hydrate the user + course for the detail view.
 */
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Certificate } from "@/domain/entities/Certificate";
import type { User } from "@/domain/entities/User";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface AdminGetCertificateInput {
  certificateId: string;
}

export type AdminGetCertificateError =
  | { kind: "certificate_not_found" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | CertificateRepositoryError
  | { kind: "user_error"; message: string }
  | { kind: "course_error"; message: string };

export type AdminGetCertificateResult = Result<
  { certificate: Certificate; user: User; course: Course },
  AdminGetCertificateError
>;

export interface AdminGetCertificateDeps {
  certificateRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
}

export class AdminGetCertificate {
  constructor(private readonly deps: AdminGetCertificateDeps) {}

  async execute(input: AdminGetCertificateInput): Promise<AdminGetCertificateResult> {
    const certResult = await this.deps.certificateRepo.findById(input.certificateId);
    if (!certResult.ok) {
      return Result.err(certResult.error);
    }
    if (!certResult.value) {
      return Result.err({ kind: "certificate_not_found" });
    }
    const certificate = certResult.value;

    const userResult = await this.deps.userRepo.findById(certificate.userId);
    if (!userResult.ok) {
      if (userResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      return Result.err({ kind: "user_error", message: String(userResult.error.kind) });
    }

    const courseResult = await this.deps.courseRepo.findById(certificate.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      return Result.err({ kind: "course_error", message: String(courseResult.error.kind) });
    }

    return Result.ok({
      certificate,
      user: userResult.value,
      course: courseResult.value,
    });
  }
}

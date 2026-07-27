/**
 * AdminListCertificates — admin list view of every issued certificate.
 *
 * STORY-092 (US-008). Mirrors ListRefundRequests (sort order) and
 * AdminListQuizzes (course hydration). Optional status filter narrows
 * to active or revoked. Batch-hydrates user + course via two Map<id,
 * X> built by deduping the foreign keys with a Set.
 */
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Certificate, CertificateStatus } from "@/domain/entities/Certificate";
import type { User } from "@/domain/entities/User";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface AdminListCertificatesInput {
  status?: CertificateStatus;
}

export type AdminListCertificatesError =
  | CertificateRepositoryError
  | { kind: "user_error"; message: string }
  | { kind: "course_error"; message: string };

export type AdminListCertificatesResult = Result<
  {
    certificates: readonly Certificate[];
    users: ReadonlyMap<string, User>;
    courses: ReadonlyMap<string, Course>;
  },
  AdminListCertificatesError
>;

export interface AdminListCertificatesDeps {
  certificateRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
}

export class AdminListCertificates {
  constructor(private readonly deps: AdminListCertificatesDeps) {}

  async execute(input: AdminListCertificatesInput): Promise<AdminListCertificatesResult> {
    const listResult = await this.deps.certificateRepo.listAll({
      status: input.status,
    });
    if (!listResult.ok) {
      return Result.err(listResult.error);
    }

    const certificates = listResult.value;
    const userIds = Array.from(new Set(certificates.map((c) => c.userId)));
    const courseIds = Array.from(new Set(certificates.map((c) => c.courseId)));

    const users = new Map<string, User>();
    for (const userId of userIds) {
      const r = await this.deps.userRepo.findById(userId);
      if (!r.ok) {
        return Result.err({ kind: "user_error", message: String(r.error.kind) });
      }
      if (r.value) users.set(userId, r.value);
    }

    const courses = new Map<string, Course>();
    for (const courseId of courseIds) {
      const r = await this.deps.courseRepo.findById(courseId);
      if (!r.ok) {
        return Result.err({ kind: "course_error", message: String(r.error.kind) });
      }
      if (r.value) courses.set(courseId, r.value);
    }

    return Result.ok({ certificates, users, courses });
  }
}

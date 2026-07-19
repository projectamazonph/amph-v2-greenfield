/**
 * GetUserDetail — fetch a single user plus a summary of their enrollments.
 *
 * STORY-047: Admin user detail page.
 *
 * Returns the user entity + the count of their enrollments. The page
 * may also want a list of enrollments, but for v1 the count is enough
 * (the detail page can link to a future "view all enrollments" sub-page
 * if needed).
 *
 * Flow:
 *  1. Find user by id → user_not_found
 *  2. Count enrollments via IEnrollmentRepository.findByUserId
 *  3. Return { user, enrollmentCount }
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { IEnrollmentRepository, EnrollmentError } from "@/ports/repositories/IEnrollmentRepository";
import type { User } from "@/domain/entities/User";

// ── Input / Output types ───────────────────────────────────────────────────

export interface GetUserDetailInput {
  userId: string;
}

export type GetUserDetailError =
  | { kind: "user_not_found" }
  | { kind: "db_error"; message: string };

export type GetUserDetailResult = Result<
  { user: User; enrollmentCount: number },
  GetUserDetailError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface GetUserDetailDeps {
  userRepo: UserRepository;
  enrollmentRepo: IEnrollmentRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class GetUserDetail {
  constructor(private readonly deps: GetUserDetailDeps) {}

  async execute(input: GetUserDetailInput): Promise<GetUserDetailResult> {
    // ── 1. User ────────────────────────────────────────────
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      if (userResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      if (userResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: userResult.error.message });
      }
      // email_taken shouldn't happen on findById, but guard anyway
      return Result.err({ kind: "db_error", message: "Failed to fetch user" });
    }
    const user = userResult.value;

    // ── 2. Enrollment count ───────────────────────────────
    const enrollmentsResult = await this.deps.enrollmentRepo.findByUserId(user.id);
    if (!enrollmentsResult.ok) {
      const msg =
        enrollmentsResult.error.kind === "db_error"
          ? enrollmentsResult.error.message
          : "Failed to count enrollments";
      return Result.err({ kind: "db_error", message: msg });
    }
    const enrollmentCount = enrollmentsResult.value.length;

    // ── 3. Return ─────────────────────────────────────────
    return Result.ok({ user, enrollmentCount });
  }
}

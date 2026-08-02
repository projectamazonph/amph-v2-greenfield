/**
 * ExportUserData — student self-service data export (STORY-096).
 *
 * Gathers everything the app knows about one user into a single plain
 * object the action layer serializes to JSON for download. Limited to
 * repositories that already expose a findByUserId-style query;
 * QuizAttempt and SimulatorAttempt only support per-quiz/per-scenario
 * lookups today (no "all attempts by this user" method), so those two
 * categories are intentionally left out rather than adding new port
 * surface just for this export. `notes` on the result says so
 * explicitly instead of silently omitting them.
 */
import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type {
  IEnrollmentRepository,
  EnrollmentError,
} from "@/ports/repositories/IEnrollmentRepository";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type {
  IBadgeAwardRepository,
  BadgeAwardError,
} from "@/ports/repositories/IBadgeAwardRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { XPEventError } from "@/domain/entities/XPEvent";
import type {
  IProgressEventRepository,
  ProgressEventError,
} from "@/ports/repositories/IProgressEventRepository";
import type { Clock } from "@/ports/system/Clock";

export interface ExportUserDataInput {
  userId: string;
}

export type ExportUserDataError =
  | { kind: "user_not_found" }
  | UserError
  | OrderError
  | EnrollmentError
  | CertificateRepositoryError
  | BadgeAwardError
  | XPEventError
  | ProgressEventError;

export interface UserDataExport {
  exportedAt: string;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    subscriptionTier: string;
    totalXp: number;
    createdAt: string;
  };
  orders: readonly unknown[];
  enrollments: readonly unknown[];
  certificates: readonly unknown[];
  badgeAwards: readonly unknown[];
  xpEvents: readonly unknown[];
  progressEvents: readonly unknown[];
  notes: readonly string[];
}

export type ExportUserDataResult = Result<UserDataExport, ExportUserDataError>;

export interface ExportUserDataDeps {
  userRepo: UserRepository;
  orderRepo: IOrderRepository;
  enrollmentRepo: IEnrollmentRepository;
  certificateRepo: ICertificateRepository;
  badgeAwardRepo: IBadgeAwardRepository;
  xpEventRepo: IXPEventRepository;
  progressEventRepo: IProgressEventRepository;
  clock: Clock;
}

export class ExportUserData {
  constructor(private readonly deps: ExportUserDataDeps) {}

  async execute(input: ExportUserDataInput): Promise<ExportUserDataResult> {
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      return Result.err(
        userResult.error.kind === "not_found" ? { kind: "user_not_found" } : userResult.error,
      );
    }
    const user = userResult.value;

    const [orders, enrollments, certificates, badgeAwards, xpEvents, progressEvents] =
      await Promise.all([
        this.deps.orderRepo.findByUserId(input.userId),
        this.deps.enrollmentRepo.findByUserId(input.userId),
        this.deps.certificateRepo.findByUserId(input.userId),
        this.deps.badgeAwardRepo.findByUserId(input.userId),
        this.deps.xpEventRepo.findByUserId(input.userId),
        this.deps.progressEventRepo.findByUserId(input.userId),
      ]);

    if (!orders.ok) return Result.err(orders.error);
    if (!enrollments.ok) return Result.err(enrollments.error);
    if (!certificates.ok) return Result.err(certificates.error);
    if (!badgeAwards.ok) return Result.err(badgeAwards.error);
    if (!xpEvents.ok) return Result.err(xpEvents.error);
    if (!progressEvents.ok) return Result.err(progressEvents.error);

    return Result.ok({
      exportedAt: this.deps.clock.now().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        totalXp: user.totalXp,
        createdAt: user.createdAt.toISOString(),
      },
      orders: orders.value,
      enrollments: enrollments.value,
      certificates: certificates.value,
      badgeAwards: badgeAwards.value,
      xpEvents: xpEvents.value,
      progressEvents: progressEvents.value,
      notes: [
        "Quiz attempts and simulator attempts are not included in this export yet " +
          "(the underlying repositories only support per-quiz/per-scenario lookups, " +
          "not a full history by user).",
      ],
    });
  }
}

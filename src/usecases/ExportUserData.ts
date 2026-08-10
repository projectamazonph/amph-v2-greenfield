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
import type {
  IQuizAttemptRepository,
  QuizAttemptRepositoryError,
} from "@/ports/repositories/IQuizAttemptRepository";
import type {
  ISimulatorAttemptRepository,
  SimulatorAttemptError,
} from "@/ports/repositories/ISimulatorAttemptRepository";

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
  | ProgressEventError
  | QuizAttemptRepositoryError
  | SimulatorAttemptError;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
interface JsonObject {
  readonly [key: string]: JsonValue;
}

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
  orders: readonly JsonObject[];
  enrollments: readonly JsonObject[];
  certificates: readonly JsonObject[];
  badgeAwards: readonly JsonObject[];
  xpEvents: readonly JsonObject[];
  progressEvents: readonly JsonObject[];
  quizAttempts: readonly JsonObject[];
  simulatorAttempts: readonly JsonObject[];
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
  quizAttemptRepo: IQuizAttemptRepository;
  simulatorAttemptRepo: ISimulatorAttemptRepository;
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

    const [
      orders,
      enrollments,
      certificates,
      badgeAwards,
      xpEvents,
      progressEvents,
      quizAttempts,
      simulatorAttempts,
    ] = await Promise.all([
      this.deps.orderRepo.findByUserId(input.userId),
      this.deps.enrollmentRepo.findByUserId(input.userId),
      this.deps.certificateRepo.findByUserId(input.userId),
      this.deps.badgeAwardRepo.findByUserId(input.userId),
      this.deps.xpEventRepo.findByUserId(input.userId),
      this.deps.progressEventRepo.findByUserId(input.userId),
      this.deps.quizAttemptRepo.findByUserId(input.userId),
      this.deps.simulatorAttemptRepo.findByUserId(input.userId),
    ]);

    if (!orders.ok) return Result.err(orders.error);
    if (!enrollments.ok) return Result.err(enrollments.error);
    if (!certificates.ok) return Result.err(certificates.error);
    if (!badgeAwards.ok) return Result.err(badgeAwards.error);
    if (!xpEvents.ok) return Result.err(xpEvents.error);
    if (!progressEvents.ok) return Result.err(progressEvents.error);
    if (!quizAttempts.ok) return Result.err(quizAttempts.error);
    if (!simulatorAttempts.ok) return Result.err(simulatorAttempts.error);

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
      orders: toJsonRecords(orders.value),
      enrollments: toJsonRecords(enrollments.value),
      certificates: toJsonRecords(certificates.value),
      badgeAwards: toJsonRecords(badgeAwards.value),
      xpEvents: toJsonRecords(xpEvents.value),
      progressEvents: toJsonRecords(progressEvents.value),
      quizAttempts: toJsonRecords(quizAttempts.value),
      simulatorAttempts: toJsonRecords(simulatorAttempts.value),
      notes: [],
    });
  }
}

function toJsonRecords(values: readonly unknown[]): readonly JsonObject[] {
  return JSON.parse(JSON.stringify(values)) as JsonObject[];
}

/**
 * src/composition/container.test.ts
 *
 * The test container builder. Lives in its own file so that
 * `InMemoryEmailSender` (and any other test-only infra with heavy
 * `react-dom/server` imports) does not get pulled into the production
 * bundle via `next build`.
 *
 * Test code imports `buildTestContainer` from this module. Production
 * code never imports this file.
 */

import { vi } from "vitest";

// STORY-012: NextMdxRenderer imports `server-only` (server-only
// marker package). vitest doesn't apply the `react-server` export
// condition, so the import resolves to the throwing `index.js`.
// Same workaround as `tests/unit/composition/container.test.ts` and
// `src/lib/__tests__/*`: mock to an empty module so the import
// resolves cleanly under vitest, where every test that pulls in the
// composition container (e.g. `src/usecases/__tests__/Logout.test.ts`)
// would otherwise fail at import time.
vi.mock("server-only", () => ({}));

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";
// STORY-012: MDX renderer. The test container uses the same
// NextMdxRenderer as production because the renderer has no IO
// and is fast in-process ΓÇö no need for a separate test double.
import type { IMdxContentRenderer } from "@/ports/rendering/IMdxContentRenderer";
import { NextMdxRenderer } from "@/infra/rendering/NextMdxRenderer";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { StubDatabaseHealthCheck } from "@/infra/system/StubDatabaseHealthCheck";
import { TestLogger } from "@/infra/observability/TestLogger";

import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEmailVerificationRepository } from "@/infra/db/inmemory/InMemoryEmailVerificationRepository";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
import { InMemorySentReminderRepository } from "@/infra/db/inmemory/InMemorySentReminderRepository";
import { EmailVerificationTemplateRenderer } from "@/infra/email/templates/EmailVerificationRenderer";
import { LiveClassReminderTemplateRenderer } from "@/infra/email/templates/LiveClassReminderRenderer";
import { PasswordResetTemplateRenderer } from "@/infra/email/templates/PasswordResetRenderer";
import { WelcomeTemplateRenderer } from "@/infra/email/templates/WelcomeRenderer";
import { PasswordChangedTemplateRenderer } from "@/infra/email/templates/PasswordChangedRenderer";
import { CertificateEmailTemplateRenderer } from "@/infra/email/templates/CertificateEmailRenderer";
import type { ReceiptRenderer } from "@/ports/email/ReceiptRenderer";
import { ReceiptTemplateRenderer } from "@/infra/email/templates/ReceiptRenderer";
import { RefundTemplateRenderer } from "@/infra/email/templates/RefundTemplateRenderer";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryXPAwardRepository } from "@/infra/repositories/InMemoryXPAwardRepository";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryBadgeAwardRepository } from "@/infra/repositories/InMemoryBadgeAwardRepository";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { InMemoryProgressEventRepository } from "@/infra/repositories/InMemoryProgressEventRepository";
import { InMemoryUserStreakRepository } from "@/infra/repositories/InMemoryUserStreakRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { InMemorySimulatorScenarioCalibrationRepository } from "@/infra/repositories/inmemory/InMemorySimulatorScenarioCalibrationRepository";
import { InMemoryAttemptFeedbackRepository } from "@/infra/repositories/InMemoryAttemptFeedbackRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { StaticKeywordDatasetRepository } from "@/infra/repositories/StaticKeywordDatasetRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryWebhookEventLog } from "@/infra/repositories/InMemoryWebhookEventLog";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { StubAccessPolicy } from "@/infra/access/StubAccessPolicy";
import { FakeCertificateHashGenerator } from "@/infra/security/FakeCertificateHashGenerator";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { FakeTotpService } from "@/infra/security/FakeTotpService";
import type { TotpService } from "@/ports/security/TotpService";
import { InMemoryRateLimiter } from "@/infra/security/InMemoryRateLimiter";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import { SignUp } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import { Logout } from "@/usecases/Logout";
import { EnableTwoFactor } from "@/usecases/EnableTwoFactor";
import { ConfirmTwoFactor } from "@/usecases/ConfirmTwoFactor";
import { DisableTwoFactor } from "@/usecases/DisableTwoFactor";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { GetCheckoutSummary } from "@/usecases/GetCheckoutSummary";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { AuthorizeLessonAccess } from "@/usecases/AuthorizeLessonAccess";
import { MarkLessonComplete } from "@/usecases/MarkLessonComplete";
import { ApplyDiscountCode } from "@/usecases/ApplyDiscountCode";
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import { AwardXP } from "@/usecases/AwardXP";
import { AwardBadge } from "@/usecases/AwardBadge";
import { ListUserBadges } from "@/usecases/ListUserBadges";
import { IssueCertificate } from "@/usecases/IssueCertificate";
import { RenderCertificatePdf } from "@/usecases/RenderCertificatePdf";
import { VerifyCertificate } from "@/usecases/VerifyCertificate";
import { RevokeCertificate } from "@/usecases/RevokeCertificate";
// STORY-092 (US-008): admin certificate list + detail
import { AdminListCertificates } from "@/usecases/AdminListCertificates";
import { AdminGetCertificate } from "@/usecases/AdminGetCertificate";
import { GetAdminDashboardStats } from "@/usecases/GetAdminDashboardStats";
import { ListCourses } from "@/usecases/ListCourses";
import { GetCourse } from "@/usecases/GetCourse";
// STORY-014: public catalog wired to Module+Lesson tables
import { ListCatalogCourses } from "@/usecases/ListCatalogCourses";
import { GetCatalogCourse } from "@/usecases/GetCatalogCourse";
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
// STORY-047: admin users list + user detail + impersonate
import { ListUsers } from "@/usecases/ListUsers";
import { GetUserDetail } from "@/usecases/GetUserDetail";
import { ImpersonateUser } from "@/usecases/ImpersonateUser";
import { AdminGrantSubscription } from "@/usecases/AdminGrantSubscription";
import { AdminSetEnrollmentStatus } from "@/usecases/AdminSetEnrollmentStatus";
import { GetAdminContentStats } from "@/usecases/GetAdminContentStats";
// STORY-048a: admin courses CRUD
import { AdminListCourses } from "@/usecases/AdminListCourses";
import { AdminGetCourse } from "@/usecases/AdminGetCourse";
import { CreateCourse } from "@/usecases/CreateCourse";
import { UpdateCourse } from "@/usecases/UpdateCourse";
import { ArchiveCourse } from "@/usecases/ArchiveCourse";
// STORY-048b: admin modules CRUD + reorder
import { AdminListModules } from "@/usecases/AdminListModules";
import { AdminGetModule } from "@/usecases/AdminGetModule";
import { CreateModule } from "@/usecases/CreateModule";
import { UpdateModule } from "@/usecases/UpdateModule";
import { DeleteModule } from "@/usecases/DeleteModule";
import { ReorderModules } from "@/usecases/ReorderModules";
// STORY-048c: admin lessons CRUD + reorder
import { AdminListLessons } from "@/usecases/AdminListLessons";
import { AdminGetLesson } from "@/usecases/AdminGetLesson";
import { CreateLesson } from "@/usecases/CreateLesson";
import { UpdateLesson } from "@/usecases/UpdateLesson";
import { DeleteLesson } from "@/usecases/DeleteLesson";
import { ReorderLessons } from "@/usecases/ReorderLessons";
// STORY-049: admin payments + refunds + refund override
import { AdminListPayments } from "@/usecases/AdminListPayments";
import { AdminGetPayment } from "@/usecases/AdminGetPayment";
import { ProcessRefund } from "@/usecases/ProcessRefund";
import { RefundOverride } from "@/usecases/RefundOverride";
// STORY-062: refund request list + process
import { ListRefundRequests } from "@/usecases/ListRefundRequests";
import { AdminProcessRefund } from "@/usecases/AdminProcessRefund";
import { RequestRefund } from "@/usecases/RequestRefund";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";
import { ListAuditLogs } from "@/usecases/ListAuditLogs";
import { ExportAuditLogs } from "@/usecases/ExportAuditLogs";
import { AdminListDiscountCodes } from "@/usecases/AdminListDiscountCodes";
import { AdminGetDiscountCode } from "@/usecases/AdminGetDiscountCode";
import { AdminCreateDiscountCode } from "@/usecases/AdminCreateDiscountCode";
import { AdminUpdateDiscountCode } from "@/usecases/AdminUpdateDiscountCode";
import { AdminArchiveDiscountCode } from "@/usecases/AdminArchiveDiscountCode";
import { AdminListBadges } from "@/usecases/AdminListBadges";
import { AdminGetBadge } from "@/usecases/AdminGetBadge";
import { AdminCreateBadge } from "@/usecases/AdminCreateBadge";
import { AdminUpdateBadge } from "@/usecases/AdminUpdateBadge";
import { AdminArchiveBadge } from "@/usecases/AdminArchiveBadge";
import { ListEmailTemplates } from "@/usecases/ListEmailTemplates";
import { GetEmailTemplate } from "@/usecases/GetEmailTemplate";
import { UpdateEmailTemplate } from "@/usecases/UpdateEmailTemplate";
import { DeleteUserAccount } from "@/usecases/DeleteUserAccount";
import { ExportUserData } from "@/usecases/ExportUserData";
import { AdminListQuizzes } from "@/usecases/AdminListQuizzes";
import { AdminGetQuiz } from "@/usecases/AdminGetQuiz";
import { AdminCreateQuiz } from "@/usecases/AdminCreateQuiz";
import { AdminUpdateQuiz } from "@/usecases/AdminUpdateQuiz";
import { AdminDeleteQuiz } from "@/usecases/AdminDeleteQuiz";
import { AdminListScenarios } from "@/usecases/AdminListScenarios";
import { GetSimulatorScenario } from "@/usecases/GetSimulatorScenario";
import { CreateSimulatorScenario } from "@/usecases/CreateSimulatorScenario";
import { UpdateSimulatorScenario } from "@/usecases/UpdateSimulatorScenario";
import { ArchiveSimulatorScenario } from "@/usecases/ArchiveSimulatorScenario";
import { PublishSimulatorScenario } from "@/usecases/PublishSimulatorScenario";
import { CreateScenarioVersionDraft } from "@/usecases/CreateScenarioVersionDraft";
import { ListScenarioVersions } from "@/usecases/ListScenarioVersions";
import { StartSimulatorAttempt } from "@/usecases/StartSimulatorAttempt";
import { SaveSimulatorDecision } from "@/usecases/SaveSimulatorDecision";
import { SubmitSimulatorAttempt } from "@/usecases/SubmitSimulatorAttempt";
import { GradeSimulatorAttempt } from "@/usecases/GradeSimulatorAttempt";
import { SetScenarioCalibration } from "@/usecases/SetScenarioCalibration";
import { GetScenarioCalibration } from "@/usecases/GetScenarioCalibration";
import { ComposeAttemptFeedback } from "@/usecases/ComposeAttemptFeedback";
import { CheckChallengeModeUnlocked } from "@/usecases/CheckChallengeModeUnlocked";
import { AdminListLiveClasses } from "@/usecases/AdminListLiveClasses";
import { AdminGetLiveClass } from "@/usecases/AdminGetLiveClass";
import { CreateLiveClass } from "@/usecases/CreateLiveClass";
import { UpdateLiveClass } from "@/usecases/UpdateLiveClass";
import { DeleteLiveClass } from "@/usecases/DeleteLiveClass";
import { VerifyEmail } from "@/usecases/auth/VerifyEmail";
import { ResendVerification } from "@/usecases/auth/ResendVerification";
import { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import { ResetPassword } from "@/usecases/auth/ResetPassword";
import { SendLiveClassReminders } from "@/usecases/SendLiveClassReminders";
import { ListLiveClassesForStudent } from "@/usecases/ListLiveClassesForStudent";
import { RsvpLiveClass } from "@/usecases/RsvpLiveClass";
import { CancelLiveClassRsvp } from "@/usecases/CancelLiveClassRsvp";
import { MarkLiveClassRecordingWatched } from "@/usecases/MarkLiveClassRecordingWatched";
import { InMemoryLiveClassRegistrationRepository } from "@/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { CreateResource } from "@/usecases/CreateResource";
import { UpdateResource } from "@/usecases/UpdateResource";
import { DeleteResource } from "@/usecases/DeleteResource";
import { AdminListResources } from "@/usecases/AdminListResources";
import { AdminGetResource } from "@/usecases/AdminGetResource";
import { ListAvailableResources } from "@/usecases/ListAvailableResources";
import { RecordResourceDownload } from "@/usecases/RecordResourceDownload";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";
import { UploadFile } from "@/usecases/UploadFile";
import { DeleteFile } from "@/usecases/DeleteFile";
import { PurgeResource } from "@/usecases/PurgeResource";

import type { AppContainer } from "./container";

// TestContainer narrows the AppContainer's port types to the concrete
// in-memory adapters. Tests need this so they can call test-only methods
// like .users.set(...) or .seed() on the in-memory repos.
export interface TestContainer extends AppContainer {
  logger: TestLogger;
  rateLimiter: InMemoryRateLimiter;
  databaseHealthCheck: StubDatabaseHealthCheck;
  userRepo: InMemoryUserRepository;
  sessionRepo: InMemorySessionRepository;
  courseRepo: InMemoryCourseRepository;
  moduleRepo: InMemoryModuleRepository;
  lessonRepo: InMemoryLessonRepository;
  orderRepo: InMemoryOrderRepository;
  enrollmentRepo: InMemoryEnrollmentRepository;
  discountCodeRepo: InMemoryDiscountCodeRepository;
  quizRepo: InMemoryQuizRepository;
  quizAttemptRepo: InMemoryQuizAttemptRepository;
  xpEventRepo: InMemoryXPEventRepository;
  xpAwardRepo: InMemoryXPAwardRepository;
  badgeRepo: InMemoryBadgeRepository;
  badgeAwardRepo: InMemoryBadgeAwardRepository;
  emailTemplateRepo: InMemoryEmailTemplateRepository;
  certificateRepo: InMemoryCertificateRepository;
  progressEventRepo: InMemoryProgressEventRepository;
  certificateRenderer: StaticCertificateRenderer;
  // STORY-012: tests share NextMdxRenderer with production.
  mdxRenderer: IMdxContentRenderer;
  accessPolicy: StubAccessPolicy;
  auditLog: InMemoryAuditLog;
  webhookEventLog: InMemoryWebhookEventLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
  scenarioRepo: InMemorySimulatorScenarioRepository;
  simulatorAttemptRepo: InMemorySimulatorAttemptRepository;
  scorePolicyRepo: InMemoryScorePolicyRepository;
  // STORY-086: per-scenario instructor calibration ranges
  calibrationRepo: InMemorySimulatorScenarioCalibrationRepository;
  feedbackRepo: InMemoryAttemptFeedbackRepository;
  liveClassRepo: InMemoryLiveClassRepository;
  liveClassRegistrationRepo: InMemoryLiveClassRegistrationRepository;
  resourceRepo: InMemoryResourceRepository;
  fileStorage: InMemoryFileStorage;
  pricingTierRepo: InMemoryPricingTierRepository;
  keywordDatasetRepo: StaticKeywordDatasetRepository;
  sentReminderRepo: InMemorySentReminderRepository;
  emailVerificationRepo: InMemoryEmailVerificationRepository;
  passwordResetRepo: InMemoryPasswordResetRepository;
  receiptEmailRenderer: ReceiptRenderer;
}

export function buildTestContainer(): TestContainer {
  const clock = new FixedClock(new Date());
  const idGen = new InMemoryIdGenerator();
  const databaseHealthCheck = new StubDatabaseHealthCheck();
  const logger = new TestLogger();
  const rateLimiter = new InMemoryRateLimiter();
  const userRepo = new InMemoryUserRepository();
  const courseRepo = new InMemoryCourseRepository();
  const moduleRepo = new InMemoryModuleRepository();
  const lessonRepo = new InMemoryLessonRepository();
  const rebuildCourseCurriculum = new RebuildCourseCurriculum({
    courseRepo,
    moduleRepo,
    lessonRepo,
    logger,
  });
  const orderRepo = new InMemoryOrderRepository();
  const enrollmentRepo = new InMemoryEnrollmentRepository();
  const discountCodeRepo = new InMemoryDiscountCodeRepository();
  const quizRepo = new InMemoryQuizRepository();
  const quizAttemptRepo = new InMemoryQuizAttemptRepository();
  const xpEventRepo = new InMemoryXPEventRepository();
  const xpAwardRepo = new InMemoryXPAwardRepository(userRepo);
  const badgeRepo = new InMemoryBadgeRepository();
  const badgeAwardRepo = new InMemoryBadgeAwardRepository();
  const emailTemplateRepo = new InMemoryEmailTemplateRepository();
  const certificateRepo = new InMemoryCertificateRepository();
  const progressEventRepo = new InMemoryProgressEventRepository();
  const userStreakRepo = new InMemoryUserStreakRepository();
  const sessionRepo = new InMemorySessionRepository();
  const emailVerificationRepo = new InMemoryEmailVerificationRepository();
  const passwordResetRepo = new InMemoryPasswordResetRepository();
  const sentReminderRepo = new InMemorySentReminderRepository();
  const verificationEmailRenderer = new EmailVerificationTemplateRenderer();
  const liveClassReminderRenderer = new LiveClassReminderTemplateRenderer();
  const passwordResetEmailRenderer = new PasswordResetTemplateRenderer();
  const welcomeEmailRenderer = new WelcomeTemplateRenderer();
  const passwordChangedEmailRenderer = new PasswordChangedTemplateRenderer();
  const certificateEmailRenderer = new CertificateEmailTemplateRenderer();
  const receiptEmailRenderer = new ReceiptTemplateRenderer();
  const refundEmailRenderer = new RefundTemplateRenderer();
  const paymentGateway: IPaymentGateway = new StubPaymentGateway();
  const awardXp = new AwardXP({ xpAwardRepo, idGen, clock });
  const accessPolicy = new StubAccessPolicy();
  const certificateHashGen: CertificateHashGenerator = new FakeCertificateHashGenerator();
  const certificateRenderer: CertificateRenderer = new StaticCertificateRenderer();
  // STORY-012: same NextMdxRenderer as production. No IO, no
  // stub needed ΓÇö the test container just hands every test a
  // shared, fresh instance with no state leaking between suites.
  const mdxRenderer: IMdxContentRenderer = new NextMdxRenderer();
  const emailSender: EmailSender = new InMemoryEmailSender();
  const jwt: JwtService = new JoseJwtService(
    process.env.JWT_SECRET ?? "test-secret-must-be-at-least-32-bytes-long-ok",
  );
  const passwordHasher: PasswordHasher = new Argon2PasswordHasher();
  // FakeTotpService (deterministic fixed code), not the real otpauth
  // adapter ΓÇö tests exercising 2FA-gated login need a stable code to
  // assert against rather than dealing with real time-based codes.
  const totpService: TotpService = new FakeTotpService();
  // STORY-050a: audit log
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({ auditLog, idGen, clock, logger });
  const webhookEventLog = new InMemoryWebhookEventLog();
  // STORY-061: audit log viewer + CSV export
  const listAuditLogs = new ListAuditLogs({ auditLog });
  const exportAuditLogs = new ExportAuditLogs({ auditLog });
  // STORY-050b: simulator scenario repo
  const scenarioRepo = new InMemorySimulatorScenarioRepository();
  // STORY-064: simulator attempt repo
  const simulatorAttemptRepo = new InMemorySimulatorAttemptRepository();
  // STORY-065: scoring engine
  const scorePolicyRepo = new InMemoryScorePolicyRepository();
  // STORY-086: per-scenario instructor calibration ranges
  const calibrationRepo = new InMemorySimulatorScenarioCalibrationRepository();
  // STORY-066: feedback composer
  const feedbackRepo = new InMemoryAttemptFeedbackRepository();
  // STORY-050c: live class repo
  const liveClassRepo = new InMemoryLiveClassRepository();
  const liveClassRegistrationRepo = new InMemoryLiveClassRegistrationRepository();
  // STORY-098: download center resources
  const resourceRepo = new InMemoryResourceRepository();
  const fileStorage = new InMemoryFileStorage();
  // STORY-011: pricing tier repo
  const pricingTierRepo = new InMemoryPricingTierRepository();
  // STORY-081: same in-code repository as production -- no DB table yet.
  const keywordDatasetRepo = new StaticKeywordDatasetRepository();

  // STORY-008: password reset. Hoisted (not built inline in the returned
  // object below) so adminGrantSubscription can reuse this same instance,
  // matching the production container's wiring.
  const requestPasswordReset = new RequestPasswordReset({
    users: userRepo,
    passwordResets: passwordResetRepo,
    email: emailSender,
    passwordResetEmailRenderer,
    rateLimiter,
    clock,
    ids: idGen,
    logger,
    emailTemplateRepo,
  });

  // Hoisted so adminGrantSubscription can reuse the same EnrollStudent
  // instance for its auto-enrollment step. Mirrors the production
  // container's wiring.
  const enrollStudent = new EnrollStudent({
    userRepo,
    courseRepo,
    enrollmentRepo,
    orderRepo,
    idGen,
  });

  // STORY-049 + STORY-062: build RefundOverride once. The
  // `refundOverride` container entry and `adminProcessRefund` share
  // the same instance ΓÇö matches the production container's wiring.
  const refundOverride = new RefundOverride({
    orderRepo,
    paymentGateway,
    recordAuditLog,
    courseRepo,
    userRepo,
    emailSender,
    refundEmailRenderer,
    logger,
    emailTemplateRepo,
  });

  return {
    clock,
    idGen,
    databaseHealthCheck,
    emailVerificationRepo,
    passwordResetRepo,
    logger,
    rateLimiter,
    userRepo,
    sessionRepo,
    userStreakRepo,
    courseRepo,
    moduleRepo,
    lessonRepo,
    orderRepo,
    enrollmentRepo,
    paymentGateway,
    jwt,
    passwordHasher,
    signUp: new SignUp(userRepo, idGen, clock, passwordHasher, recordAuditLog),
    login: new Login(userRepo, passwordHasher, sessionRepo, idGen, clock, jwt, totpService),
    logout: new Logout(sessionRepo, jwt),
    totpService,
    enableTwoFactor: new EnableTwoFactor({ userRepo, totpService }),
    confirmTwoFactor: new ConfirmTwoFactor({ userRepo, totpService, recordAuditLog }),
    disableTwoFactor: new DisableTwoFactor({ userRepo, hasher: passwordHasher, recordAuditLog }),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      pricingTierRepo,
      orderRepo,
      paymentGateway,
      baseUrl: "https://test.amph.example.com",
    }),
    getCheckoutSummary: new GetCheckoutSummary({ courseRepo, pricingTierRepo }),
    checkCourseAccess: new CheckCourseAccess(accessPolicy),
    // P0-5: per-lesson access decision
    authorizeLessonAccess: new AuthorizeLessonAccess({
      userRepo,
      courseRepo,
      enrollmentRepo,
    }),
    markLessonComplete: new MarkLessonComplete({
      enrollmentRepo,
      courseRepo,
      progressEventRepo,
      idGen,
      clock,
    }),
    enrollStudent,
    discountCodeRepo,
    applyDiscountCode: new ApplyDiscountCode({
      discountCodeRepo,
      clock,
    }),
    quizRepo,
    quizAttemptRepo,
    xpEventRepo,
    xpAwardRepo,
    badgeRepo,
    badgeAwardRepo,
    certificateRepo,
    progressEventRepo,
    certificateHashGen,
    certificateRenderer,
    mdxRenderer,
    emailSender,
    receiptEmailRenderer,
    accessPolicy,
    recordQuizAttempt: new RecordQuizAttempt({
      quizRepo,
      quizAttemptRepo,
      awardXp,
      idGen,
      clock,
      accessPolicy,
      logger,
    }),
    awardXp,
    awardBadge: new AwardBadge({
      badgeRepo,
      badgeAwardRepo,
      awardXp,
      idGen,
      logger,
    }),
    listUserBadges: new ListUserBadges({ badgeRepo, badgeAwardRepo }),
    issueCertificate: new IssueCertificate({
      enrollmentRepo,
      courseRepo,
      certificateRepo,
      hashGen: certificateHashGen,
      idGen,
      clock,
      userRepo,
      emailSender,
      certificateEmailRenderer,
      logger,
      emailTemplateRepo,
    }),
    renderCertificatePdf: new RenderCertificatePdf({
      certificateRepo,
      userRepo,
      courseRepo,
      renderer: certificateRenderer,
    }),
    verifyCertificate: new VerifyCertificate({
      certificateRepo,
      userRepo,
      courseRepo,
    }),
    revokeCertificate: new RevokeCertificate({
      certificateRepo,
      clock,
    }),
    // STORY-092 (US-008): admin certificate list + detail
    adminListCertificates: new AdminListCertificates({
      certificateRepo,
      userRepo,
      courseRepo,
    }),
    adminGetCertificate: new AdminGetCertificate({
      certificateRepo,
      userRepo,
      courseRepo,
    }),
    getAdminDashboardStats: new GetAdminDashboardStats({
      userRepo,
      courseRepo,
      orderRepo,
      enrollmentRepo,
      certificateRepo,
    }),
    listCourses: new ListCourses(courseRepo),
    getCourse: new GetCourse(courseRepo),
    // STORY-014: public catalog wired to Module+Lesson tables
    listCatalogCourses: new ListCatalogCourses({
      courseRepo,
      moduleRepo,
      lessonRepo,
    }),
    getCatalogCourse: new GetCatalogCourse({
      courseRepo,
      moduleRepo,
      lessonRepo,
    }),
    // STORY-015: public pricing page wired to PricingTier rows
    listPricingTiers: new ListPricingTiers({ pricingTierRepo }),
    // STORY-047: admin users list + user detail + impersonate
    listUsers: new ListUsers({ userRepo }),
    getUserDetail: new GetUserDetail({ userRepo, enrollmentRepo }),
    impersonateUser: new ImpersonateUser({
      userRepo,
      sessionRepo,
      jwt,
      clock,
      idGen,
      recordAuditLog,
    }),
    adminGrantSubscription: new AdminGrantSubscription({
      userRepo,
      courseRepo,
      idGen,
      passwordHasher,
      recordAuditLog,
      requestPasswordReset,
      enrollStudent,
      logger,
    }),
    adminSetEnrollmentStatus: new AdminSetEnrollmentStatus({
      userRepo,
      courseRepo,
      enrollmentRepo,
      idGen,
      clock,
      recordAuditLog,
    }),
    getAdminContentStats: new GetAdminContentStats({ courseRepo, moduleRepo, lessonRepo }),
    // STORY-048a: admin courses CRUD
    adminListCourses: new AdminListCourses({ courseRepo }),
    adminGetCourse: new AdminGetCourse({ courseRepo }),
    createCourse: new CreateCourse({ courseRepo, recordAuditLog }),
    updateCourse: new UpdateCourse({ courseRepo, recordAuditLog }),
    archiveCourse: new ArchiveCourse({ courseRepo, recordAuditLog }),
    // STORY-048b: admin modules CRUD + reorder
    adminListModules: new AdminListModules({ moduleRepo }),
    adminGetModule: new AdminGetModule({ moduleRepo }),
    createModule: new CreateModule({
      moduleRepo,
      idGen,
      clock,
      recordAuditLog,
      rebuildCourseCurriculum,
    }),
    updateModule: new UpdateModule({ moduleRepo, clock, recordAuditLog, rebuildCourseCurriculum }),
    deleteModule: new DeleteModule({ moduleRepo, recordAuditLog, rebuildCourseCurriculum }),
    reorderModules: new ReorderModules({ moduleRepo, recordAuditLog, rebuildCourseCurriculum }),
    // STORY-048c: admin lessons CRUD + reorder
    adminListLessons: new AdminListLessons({ lessonRepo }),
    adminGetLesson: new AdminGetLesson({ lessonRepo }),
    createLesson: new CreateLesson({
      lessonRepo,
      moduleRepo,
      idGen,
      clock,
      recordAuditLog,
      rebuildCourseCurriculum,
    }),
    updateLesson: new UpdateLesson({
      lessonRepo,
      moduleRepo,
      clock,
      recordAuditLog,
      rebuildCourseCurriculum,
    }),
    deleteLesson: new DeleteLesson({
      lessonRepo,
      moduleRepo,
      recordAuditLog,
      rebuildCourseCurriculum,
    }),
    reorderLessons: new ReorderLessons({
      lessonRepo,
      moduleRepo,
      recordAuditLog,
      rebuildCourseCurriculum,
    }),
    // STORY-049: admin payments + refunds + refund override
    adminListPayments: new AdminListPayments({ orderRepo, userRepo }),
    adminGetPayment: new AdminGetPayment({ orderRepo, userRepo, courseRepo }),
    processRefund: new ProcessRefund({
      orderRepo,
      paymentGateway,
      clock,
      courseRepo,
      userRepo,
      emailSender,
      refundEmailRenderer,
      logger,
      emailTemplateRepo,
    }),
    refundOverride,
    // STORY-062: admin refund request list + process
    listRefundRequests: new ListRefundRequests({ orderRepo, userRepo }),
    adminProcessRefund: new AdminProcessRefund({ orderRepo, refundOverride }),
    requestRefund: new RequestRefund({ orderRepo, enrollmentRepo, clock }),
    // STORY-050d: admin discount code CRUD
    adminListDiscountCodes: new AdminListDiscountCodes({ discountCodeRepo }),
    adminGetDiscountCode: new AdminGetDiscountCode({ discountCodeRepo }),
    adminCreateDiscountCode: new AdminCreateDiscountCode({
      discountCodeRepo,
      idGen,
      recordAuditLog,
    }),
    adminUpdateDiscountCode: new AdminUpdateDiscountCode({ discountCodeRepo, recordAuditLog }),
    adminArchiveDiscountCode: new AdminArchiveDiscountCode({ discountCodeRepo, recordAuditLog }),
    // STORY-050e: admin badge CRUD
    adminListBadges: new AdminListBadges({ badgeRepo }),
    adminGetBadge: new AdminGetBadge({ badgeRepo }),
    adminCreateBadge: new AdminCreateBadge({ badgeRepo, recordAuditLog }),
    adminUpdateBadge: new AdminUpdateBadge({ badgeRepo, recordAuditLog }),
    adminArchiveBadge: new AdminArchiveBadge({ badgeRepo, recordAuditLog }),
    emailTemplateRepo,
    listEmailTemplates: new ListEmailTemplates({ emailTemplateRepo }),
    getEmailTemplate: new GetEmailTemplate({ emailTemplateRepo }),
    updateEmailTemplate: new UpdateEmailTemplate({
      emailTemplateRepo,
      recordAuditLog,
      idGen,
      clock,
    }),
    deleteUserAccount: new DeleteUserAccount({
      userRepo,
      hasher: passwordHasher,
      sessionRepo,
      recordAuditLog,
    }),
    exportUserData: new ExportUserData({
      userRepo,
      orderRepo,
      enrollmentRepo,
      certificateRepo,
      badgeAwardRepo,
      xpEventRepo,
      progressEventRepo,
      quizAttemptRepo,
      simulatorAttemptRepo,
      clock,
    }),
    // STORY-091: admin quiz CRUD
    adminListQuizzes: new AdminListQuizzes({ quizRepo, courseRepo }),
    adminGetQuiz: new AdminGetQuiz({ quizRepo, courseRepo }),
    adminCreateQuiz: new AdminCreateQuiz({ quizRepo, recordAuditLog }),
    adminUpdateQuiz: new AdminUpdateQuiz({ quizRepo, recordAuditLog }),
    adminDeleteQuiz: new AdminDeleteQuiz({ quizRepo, quizAttemptRepo, recordAuditLog }),
    simulatorRegistry: buildSimulatorRegistry(),
    auditLog,
    recordAuditLog,
    webhookEventLog,
    rebuildCourseCurriculum,
    listAuditLogs,
    exportAuditLogs,
    scenarioRepo,
    simulatorAttemptRepo,
    scorePolicyRepo,
    calibrationRepo,
    feedbackRepo,
    // STORY-050b: simulator scenario CRUD
    adminListScenarios: new AdminListScenarios({ scenarioRepo }),
    getSimulatorScenario: new GetSimulatorScenario({ scenarioRepo }),
    createSimulatorScenario: new CreateSimulatorScenario({ scenarioRepo, recordAuditLog }),
    updateSimulatorScenario: new UpdateSimulatorScenario({ scenarioRepo, recordAuditLog }),
    archiveSimulatorScenario: new ArchiveSimulatorScenario({ scenarioRepo, recordAuditLog }),
    // STORY-085: scenario publishing + versioning
    publishSimulatorScenario: new PublishSimulatorScenario({ scenarioRepo, recordAuditLog }),
    createScenarioVersionDraft: new CreateScenarioVersionDraft({
      scenarioRepo,
      recordAuditLog,
      idGen,
      clock,
    }),
    listScenarioVersions: new ListScenarioVersions({ scenarioRepo }),
    // STORY-064: simulator attempt lifecycle
    startSimulatorAttempt: new StartSimulatorAttempt({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    }),
    saveSimulatorDecision: new SaveSimulatorDecision({ attemptRepo: simulatorAttemptRepo }),
    submitSimulatorAttempt: new SubmitSimulatorAttempt({
      attemptRepo: simulatorAttemptRepo,
      clock,
    }),
    gradeSimulatorAttempt: new GradeSimulatorAttempt({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
      calibrationRepo,
      scenarioRepo,
      clock,
    }),
    // STORY-086: instructor sets per-scenario calibration bands
    setScenarioCalibration: new SetScenarioCalibration({
      calibrationRepo,
      recordAuditLog,
      idGen,
      clock,
    }),
    // STORY-086: instructor reads the existing calibration for an edit form
    getScenarioCalibration: new GetScenarioCalibration({ calibrationRepo }),
    composeAttemptFeedback: new ComposeAttemptFeedback({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    }),
    checkChallengeModeUnlocked: new CheckChallengeModeUnlocked({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
    }),
    // STORY-050c
    liveClassRepo,
    liveClassRegistrationRepo,
    pricingTierRepo,
    keywordDatasetRepo,
    sentReminderRepo,
    adminListLiveClasses: new AdminListLiveClasses({ liveClassRepo }),
    adminGetLiveClass: new AdminGetLiveClass({ liveClassRepo }),
    createLiveClass: new CreateLiveClass({ liveClassRepo, recordAuditLog }),
    updateLiveClass: new UpdateLiveClass({ liveClassRepo, recordAuditLog }),
    deleteLiveClass: new DeleteLiveClass({ liveClassRepo, recordAuditLog }),
    // STORY-007: email verification
    verifyEmail: new VerifyEmail({
      emailVerifications: emailVerificationRepo,
      users: userRepo,
      clock,
      logger,
      emailSender,
      welcomeEmailRenderer,
      emailTemplateRepo,
    }),
    resendVerification: new ResendVerification({
      users: userRepo,
      emailVerifications: emailVerificationRepo,
      clock,
      logger,
      emailSender,
      verificationEmailRenderer,
      rateLimiter,
      idGen,
      emailTemplateRepo,
    }),
    // STORY-008: password reset (hoisted above, also reused by adminGrantSubscription)
    requestPasswordReset,
    resetPassword: new ResetPassword({
      users: userRepo,
      passwordResets: passwordResetRepo,
      sessions: sessionRepo,
      clock,
      logger,
      email: emailSender,
      passwordChangedEmailRenderer,
      hasher: passwordHasher,
    }),
    // P0-7: live class reminders
    sendLiveClassReminders: new SendLiveClassReminders({
      liveClassRepo,
      enrollmentRepo,
      userRepo,
      sentReminders: sentReminderRepo,
      email: emailSender,
      clock,
      logger,
      renderer: liveClassReminderRenderer,
      emailTemplateRepo,
    }),
    // STORY-090/091: student RSVP. Wired to the same `liveClassRegistrationRepo`
    // instance exposed on the container (previously each of these three
    // constructed its own fresh InMemoryLiveClassRegistrationRepository, so an
    // RSVP made through one use case was invisible to the others and to
    // `container.liveClassRegistrationRepo` directly — a real fragmentation
    // bug found while wiring STORY-100's markLiveClassRecordingWatched, which
    // needs to see RSVPs created by rsvpLiveClass in the same test run).
    listLiveClassesForStudent: new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo,
    }),
    rsvpLiveClass: new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo,
      ids: idGen,
      clock,
    }),
    cancelLiveClassRsvp: new CancelLiveClassRsvp({
      liveClassRegistrationRepo,
      clock,
    }),
    // STORY-100: live-class recording + post-class XP
    markLiveClassRecordingWatched: new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo,
      awardXp,
      clock,
    }),
    // STORY-098: download center resources
    resourceRepo,
    fileStorage,
    createResource: new CreateResource({ resourceRepo, recordAuditLog }),
    updateResource: new UpdateResource({ resourceRepo, fileStorage, recordAuditLog, logger }),
    deleteResource: new DeleteResource({ resourceRepo, recordAuditLog }),
    adminListResources: new AdminListResources({ resourceRepo }),
    adminGetResource: new AdminGetResource({ resourceRepo }),
    listAvailableResources: new ListAvailableResources({ resourceRepo }),
    recordResourceDownload: new RecordResourceDownload({ resourceRepo, recordAuditLog }),
    purgeResource: new PurgeResource({ resourceRepo, fileStorage, recordAuditLog, logger }),
    uploadFile: new UploadFile({ fileStorage }),
    deleteFile: new DeleteFile({ fileStorage }),
  };
}

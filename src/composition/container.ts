/**
 * src/composition/container.ts
 *
 * Composition root for the production container.
 *
 * ADR-020: This is the only module in the codebase that knows about all
 * production layers. Everything else receives its dependencies via
 * constructor injection.
 *
 * Per SOLID dependency-inversion, the prod container depends on the
 * port interfaces (UserRepository, etc.) and wires them to the prod
 * adapters (PrismaUserRepository, ResendEmailSender, etc.).
 *
 * The test container lives in ./container.test.ts. It uses the same
 * port interfaces but wires in-memory adapters (InMemoryUserRepository,
 * InMemoryEmailSender, etc.). Splitting the two files keeps the
 * in-memory test fakes (some of which import `react-dom/server` for
 * rendering React Email templates) out of the production bundle.
 * Turbopack would otherwise reject those imports at `next build` time.
 *
 * Test code imports `buildTestContainer` from "./container.test".
 * Production code only ever imports `buildContainer` (or
 * `runWithContainer` / `getContainer`) from this file.
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ΓöÇΓöÇ System ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import { SystemClock } from "@/ports/system/Clock";
import type { Clock } from "@/ports/system/Clock";

import { UlidGenerator } from "@/infra/system/UlidGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";

import { PrismaDatabaseHealthCheck } from "@/infra/system/PrismaDatabaseHealthCheck";
import type { DatabaseHealthCheck } from "@/ports/system/DatabaseHealthCheck";

// ΓöÇΓöÇ Observability ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import type { Logger } from "@/ports/observability/Logger";
import { PinoLogger } from "@/infra/observability/PinoLogger";

// ΓöÇΓöÇ Repository ports (interfaces) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { ILessonRepository } from "@/ports/repositories/ILessonRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { IAuditLog } from "@/ports/repositories/IAuditLog";
import type { IWebhookEventLog } from "@/ports/repositories/IWebhookEventLog";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import type { IAttemptFeedbackRepository } from "@/ports/repositories/IAttemptFeedbackRepository";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";
import type { KeywordDatasetRepository } from "@/ports/repositories/KeywordDatasetRepository";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";
import type { IResourceRepository } from "@/ports/repositories/IResourceRepository";
import type { IFileStorage } from "@/ports/storage/IFileStorage";

// ΓöÇΓöÇ Production adapters (only the prod ones) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";
import { PrismaCourseRepository } from "@/infra/repositories/PrismaCourseRepository";
import { PrismaModuleRepository } from "@/infra/repositories/PrismaModuleRepository";
import { PrismaLessonRepository } from "@/infra/repositories/PrismaLessonRepository";
import { PrismaOrderRepository } from "@/infra/repositories/PrismaOrderRepository";
import { PrismaSessionRepository } from "@/infra/repositories/PrismaSessionRepository";
import { PrismaEnrollmentRepository } from "@/infra/repositories/PrismaEnrollmentRepository";
import { PrismaDiscountCodeRepository } from "@/infra/repositories/PrismaDiscountCodeRepository";
import { PrismaQuizRepository } from "@/infra/repositories/PrismaQuizRepository";
import { PrismaQuizAttemptRepository } from "@/infra/repositories/PrismaQuizAttemptRepository";
import { PrismaXPEventRepository } from "@/infra/repositories/PrismaXPEventRepository";
import { PrismaBadgeRepository } from "@/infra/repositories/PrismaBadgeRepository";
import { PrismaBadgeAwardRepository } from "@/infra/repositories/PrismaBadgeAwardRepository";
import { PrismaCertificateRepository } from "@/infra/repositories/PrismaCertificateRepository";
import { PrismaProgressEventRepository } from "@/infra/repositories/PrismaProgressEventRepository";
import { PrismaAuditLog } from "@/infra/repositories/PrismaAuditLog";
import { PrismaWebhookEventLog } from "@/infra/repositories/PrismaWebhookEventLog";
import { PrismaSimulatorScenarioRepository } from "@/infra/simulator/PrismaSimulatorScenarioRepository";
import { PrismaSimulatorAttemptRepository } from "@/infra/repositories/PrismaSimulatorAttemptRepository";
import { PrismaScorePolicyRepository } from "@/infra/repositories/PrismaScorePolicyRepository";
import { PrismaAttemptFeedbackRepository } from "@/infra/repositories/PrismaAttemptFeedbackRepository";
import { PrismaLiveClassRepository } from "@/infra/live-class/PrismaLiveClassRepository";
import { PrismaLiveClassRegistrationRepository } from "@/infra/repositories/PrismaLiveClassRegistrationRepository";
import { PrismaPricingTierRepository } from "@/infra/repositories/PrismaPricingTierRepository";
import { PrismaEmailTemplateRepository } from "@/infra/repositories/PrismaEmailTemplateRepository";
import { PrismaResourceRepository } from "@/infra/repositories/PrismaResourceRepository";
import { VercelBlobFileStorage } from "@/infra/storage/VercelBlobFileStorage";
import { LocalFileStorage } from "@/infra/storage/LocalFileStorage";
import { prisma } from "@/infra/database/prisma";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";
// STORY-081: no DB table/admin CRUD for keyword datasets yet -- this
// in-code repository backs both the prod and test containers today.
import { StaticKeywordDatasetRepository } from "@/infra/repositories/StaticKeywordDatasetRepository";

import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import { NodeCertificateHashGenerator } from "@/infra/security/NodeCertificateHashGenerator";

import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";
import { ReactPdfCertificateRenderer } from "@/infra/pdf/ReactPdfCertificateRenderer";

// STORY-012: MDX content renderer port + adapter
import type { IMdxContentRenderer } from "@/ports/rendering/IMdxContentRenderer";
import { NextMdxRenderer } from "@/infra/rendering/NextMdxRenderer";

import type { EmailSender } from "@/ports/email/EmailSender";
import type { ReceiptRenderer } from "@/ports/email/ReceiptRenderer";
import { ResendEmailSender } from "@/infra/email/ResendEmailSender";
// InMemoryEmailSender is NOT imported here ΓÇö it would pull in
// react-dom/server and break `next build`. Test code uses it via
// ./container.test.ts.

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";

import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { OtpauthTotpService } from "@/infra/security/OtpauthTotpService";
import type { TotpService } from "@/ports/security/TotpService";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

// STORY-054: rate limiting
import type { RateLimiter } from "@/ports/security/RateLimiter";
import { UpstashRateLimiter } from "@/infra/security/UpstashRateLimiter";

// ΓöÇΓöÇ Use cases ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import { SignUp } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import { Logout } from "@/usecases/Logout";
import { EnableTwoFactor } from "@/usecases/EnableTwoFactor";
import { ConfirmTwoFactor } from "@/usecases/ConfirmTwoFactor";
import { DisableTwoFactor } from "@/usecases/DisableTwoFactor";
import { VerifyEmail } from "@/usecases/auth/VerifyEmail";
import { ResendVerification } from "@/usecases/auth/ResendVerification";
import type { EmailVerificationRepository } from "@/ports/repositories/EmailVerificationRepository";
import { PrismaEmailVerificationRepository } from "@/infra/repositories/PrismaEmailVerificationRepository";
import { PrismaPasswordResetRepository } from "@/infra/repositories/PrismaPasswordResetRepository";
import { PrismaSentReminderRepository } from "@/infra/repositories/PrismaSentReminderRepository";
import { EmailVerificationTemplateRenderer } from "@/infra/email/templates/EmailVerificationRenderer";
import { LiveClassReminderTemplateRenderer } from "@/infra/email/templates/LiveClassReminderRenderer";
import { PasswordResetTemplateRenderer } from "@/infra/email/templates/PasswordResetRenderer";
import { WelcomeTemplateRenderer } from "@/infra/email/templates/WelcomeRenderer";
import { PasswordChangedTemplateRenderer } from "@/infra/email/templates/PasswordChangedRenderer";
import { CertificateEmailTemplateRenderer } from "@/infra/email/templates/CertificateEmailRenderer";
import { ReceiptTemplateRenderer } from "@/infra/email/templates/ReceiptRenderer";
import { RefundTemplateRenderer } from "@/infra/email/templates/RefundTemplateRenderer";
import { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import { ResetPassword } from "@/usecases/auth/ResetPassword";
import type { PasswordResetRepository } from "@/ports/repositories/PasswordResetRepository";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { AuthorizeLessonAccess } from "@/usecases/AuthorizeLessonAccess";
import { ApplyDiscountCode } from "@/usecases/ApplyDiscountCode";
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
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import { AwardXP } from "@/usecases/AwardXP";
import { AwardBadge } from "@/usecases/AwardBadge";
import type { SimulatorRegistry } from "@/ports/simulator/SimulatorRegistry";
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
// STORY-014: public catalog pages wired to Module+Lesson tables
import { ListCatalogCourses } from "@/usecases/ListCatalogCourses";
import { GetCatalogCourse } from "@/usecases/GetCatalogCourse";
// STORY-015: public pricing page wired to PricingTier rows
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
// STORY-047: admin users list + user detail + impersonate
import { ListUsers } from "@/usecases/ListUsers";
import { GetUserDetail } from "@/usecases/GetUserDetail";
import { ImpersonateUser } from "@/usecases/ImpersonateUser";
import { AdminGrantSubscription } from "@/usecases/AdminGrantSubscription";
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
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";
import { ListAuditLogs } from "@/usecases/ListAuditLogs";
import { ExportAuditLogs } from "@/usecases/ExportAuditLogs";
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
import { ComposeAttemptFeedback } from "@/usecases/ComposeAttemptFeedback";
import { CheckChallengeModeUnlocked } from "@/usecases/CheckChallengeModeUnlocked";
import { AdminListLiveClasses } from "@/usecases/AdminListLiveClasses";
import { AdminGetLiveClass } from "@/usecases/AdminGetLiveClass";
import { CreateLiveClass } from "@/usecases/CreateLiveClass";
import { UpdateLiveClass } from "@/usecases/UpdateLiveClass";
import { DeleteLiveClass } from "@/usecases/DeleteLiveClass";
import { SendLiveClassReminders } from "@/usecases/SendLiveClassReminders";
import { ListLiveClassesForStudent } from "@/usecases/ListLiveClassesForStudent";
import { RsvpLiveClass } from "@/usecases/RsvpLiveClass";
import { CancelLiveClassRsvp } from "@/usecases/CancelLiveClassRsvp";
import { MarkLiveClassRecordingWatched } from "@/usecases/MarkLiveClassRecordingWatched";
import { CreateResource } from "@/usecases/CreateResource";
import { UpdateResource } from "@/usecases/UpdateResource";
import { DeleteResource } from "@/usecases/DeleteResource";
import { AdminListResources } from "@/usecases/AdminListResources";
import { AdminGetResource } from "@/usecases/AdminGetResource";
import { ListAvailableResources } from "@/usecases/ListAvailableResources";
import { RecordResourceDownload } from "@/usecases/RecordResourceDownload";
import { UploadFile } from "@/usecases/UploadFile";
import { DeleteFile } from "@/usecases/DeleteFile";
import { PurgeResource } from "@/usecases/PurgeResource";
import type { SentReminderRepository } from "@/ports/repositories/SentReminderRepository";

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import { TierAccessPolicy } from "@/infra/access/TierAccessPolicy";

// ΓöÇΓöÇ Container shape ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface AppContainer {
  // System
  clock: Clock;
  idGen: IdGenerator;
  /** Proposal 5: DB connectivity check backing /api/health/ready. */
  databaseHealthCheck: DatabaseHealthCheck;

  // Observability
  logger: Logger;

  // Repositories
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  courseRepo: CourseRepository;
  orderRepo: IOrderRepository;
  enrollmentRepo: IEnrollmentRepository;
  discountCodeRepo: IDiscountCodeRepository;
  quizRepo: IQuizRepository;
  quizAttemptRepo: IQuizAttemptRepository;
  xpEventRepo: IXPEventRepository;
  badgeRepo: IBadgeRepository;
  badgeAwardRepo: IBadgeAwardRepository;
  certificateRepo: ICertificateRepository;
  progressEventRepo: IProgressEventRepository;
  auditLog: IAuditLog;
  webhookEventLog: IWebhookEventLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
  totpService: TotpService;
  scenarioRepo: ISimulatorScenarioRepository;
  // STORY-064: simulator attempt infrastructure
  simulatorAttemptRepo: ISimulatorAttemptRepository;
  // STORY-065: scoring engine + dimensional policies
  scorePolicyRepo: IScorePolicyRepository;
  // STORY-066: feedback composer + remediation
  feedbackRepo: IAttemptFeedbackRepository;
  // STORY-050c: live class admin CRUD
  liveClassRepo: ILiveClassRepository;
  // STORY-091: live class RSVP for students
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  // STORY-098: download center resources
  resourceRepo: IResourceRepository;
  // STORY-098.5: download center file upload/management
  fileStorage: IFileStorage;
  // STORY-011: pricing tier repo
  pricingTierRepo: IPricingTierRepository;
  // STORY-048b/c: module + lesson repos (also used by public catalog)
  moduleRepo: IModuleRepository;
  lessonRepo: ILessonRepository;
  simulatorRegistry: SimulatorRegistry;
  // STORY-081: keyword dataset lookup for the Keyword Research simulator
  keywordDatasetRepo: KeywordDatasetRepository;
  // STORY-095: admin email template editor
  emailTemplateRepo: IEmailTemplateRepository;
  listEmailTemplates: ListEmailTemplates;
  getEmailTemplate: GetEmailTemplate;
  updateEmailTemplate: UpdateEmailTemplate;
  // STORY-096: account deletion + data export
  deleteUserAccount: DeleteUserAccount;
  exportUserData: ExportUserData;

  // External services
  paymentGateway: IPaymentGateway;
  certificateHashGen: CertificateHashGenerator;
  certificateRenderer: CertificateRenderer;
  // STORY-012: MDX content renderer (port-adapter: NextMdxRenderer)
  mdxRenderer: IMdxContentRenderer;
  emailSender: EmailSender;
  // Exposed so the PayMongo webhook route can send a receipt email
  // directly (that route reaches into container fields for all its
  // data access rather than going through a single use case).
  receiptEmailRenderer: ReceiptRenderer;
  jwt: JwtService;
  passwordHasher: PasswordHasher;

  // Security
  rateLimiter: RateLimiter;

  // Use cases
  signUp: SignUp;
  login: Login;
  logout: Logout;
  enableTwoFactor: EnableTwoFactor;
  confirmTwoFactor: ConfirmTwoFactor;
  disableTwoFactor: DisableTwoFactor;
  createPaymentIntent: CreatePaymentIntent;
  checkCourseAccess: CheckCourseAccess;
  // P0-5: per-lesson access decision (single source of truth)
  authorizeLessonAccess: AuthorizeLessonAccess;
  enrollStudent: EnrollStudent;
  applyDiscountCode: ApplyDiscountCode;
  // STORY-050d: admin discount code CRUD
  adminListDiscountCodes: AdminListDiscountCodes;
  adminGetDiscountCode: AdminGetDiscountCode;
  adminCreateDiscountCode: AdminCreateDiscountCode;
  adminUpdateDiscountCode: AdminUpdateDiscountCode;
  adminArchiveDiscountCode: AdminArchiveDiscountCode;
  // STORY-050e: admin badge CRUD
  adminListBadges: AdminListBadges;
  adminGetBadge: AdminGetBadge;
  adminCreateBadge: AdminCreateBadge;
  adminUpdateBadge: AdminUpdateBadge;
  adminArchiveBadge: AdminArchiveBadge;
  // STORY-091: admin quiz CRUD
  adminListQuizzes: AdminListQuizzes;
  adminGetQuiz: AdminGetQuiz;
  adminCreateQuiz: AdminCreateQuiz;
  adminUpdateQuiz: AdminUpdateQuiz;
  adminDeleteQuiz: AdminDeleteQuiz;
  recordQuizAttempt: RecordQuizAttempt;
  awardXp: AwardXP;
  awardBadge: AwardBadge;
  listUserBadges: ListUserBadges;
  issueCertificate: IssueCertificate;
  renderCertificatePdf: RenderCertificatePdf;
  verifyCertificate: VerifyCertificate;
  revokeCertificate: RevokeCertificate;
  // STORY-092 (US-008): admin certificate list + detail
  adminListCertificates: AdminListCertificates;
  adminGetCertificate: AdminGetCertificate;
  getAdminDashboardStats: GetAdminDashboardStats;
  listCourses: ListCourses;
  getCourse: GetCourse;
  // STORY-014: public catalog wired to Module+Lesson tables
  listCatalogCourses: ListCatalogCourses;
  getCatalogCourse: GetCatalogCourse;
  // STORY-015: public pricing page wired to PricingTier rows
  listPricingTiers: ListPricingTiers;
  // STORY-047: admin users list + user detail + impersonate
  listUsers: ListUsers;
  getUserDetail: GetUserDetail;
  impersonateUser: ImpersonateUser;
  adminGrantSubscription: AdminGrantSubscription;
  // STORY-048a: admin courses CRUD
  adminListCourses: AdminListCourses;
  adminGetCourse: AdminGetCourse;
  createCourse: CreateCourse;
  updateCourse: UpdateCourse;
  archiveCourse: ArchiveCourse;
  // STORY-048b: admin modules CRUD + reorder
  adminListModules: AdminListModules;
  adminGetModule: AdminGetModule;
  createModule: CreateModule;
  updateModule: UpdateModule;
  deleteModule: DeleteModule;
  reorderModules: ReorderModules;
  // STORY-048c: admin lessons CRUD + reorder
  adminListLessons: AdminListLessons;
  adminGetLesson: AdminGetLesson;
  createLesson: CreateLesson;
  updateLesson: UpdateLesson;
  deleteLesson: DeleteLesson;
  reorderLessons: ReorderLessons;
  // STORY-049: admin payments + refunds + refund override
  adminListPayments: AdminListPayments;
  adminGetPayment: AdminGetPayment;
  processRefund: ProcessRefund;
  refundOverride: RefundOverride;
  // STORY-062: admin refund request list + process
  listRefundRequests: ListRefundRequests;
  adminProcessRefund: AdminProcessRefund;
  // STORY-050a: audit log
  recordAuditLog: RecordAuditLog;
  // STORY-061: audit log viewer + CSV export
  listAuditLogs: ListAuditLogs;
  exportAuditLogs: ExportAuditLogs;
  // STORY-050b: simulator scenario CRUD
  adminListScenarios: AdminListScenarios;
  getSimulatorScenario: GetSimulatorScenario;
  createSimulatorScenario: CreateSimulatorScenario;
  updateSimulatorScenario: UpdateSimulatorScenario;
  archiveSimulatorScenario: ArchiveSimulatorScenario;
  publishSimulatorScenario: PublishSimulatorScenario;
  createScenarioVersionDraft: CreateScenarioVersionDraft;
  listScenarioVersions: ListScenarioVersions;
  // STORY-064: simulator attempt lifecycle
  startSimulatorAttempt: StartSimulatorAttempt;
  saveSimulatorDecision: SaveSimulatorDecision;
  submitSimulatorAttempt: SubmitSimulatorAttempt;
  // STORY-065: scoring engine
  gradeSimulatorAttempt: GradeSimulatorAttempt;
  composeAttemptFeedback: ComposeAttemptFeedback;
  // STORY-088: challenge mode unlock
  checkChallengeModeUnlocked: CheckChallengeModeUnlocked;
  // STORY-050c: live class admin CRUD
  adminListLiveClasses: AdminListLiveClasses;
  adminGetLiveClass: AdminGetLiveClass;
  createLiveClass: CreateLiveClass;
  updateLiveClass: UpdateLiveClass;
  deleteLiveClass: DeleteLiveClass;
  // STORY-007: email verification
  verifyEmail: VerifyEmail;
  resendVerification: ResendVerification;
  // STORY-008: password reset
  requestPasswordReset: RequestPasswordReset;
  resetPassword: ResetPassword;
  // P0-7: live class reminders (cron entry point)
  sendLiveClassReminders: SendLiveClassReminders;
  // STORY-090/091: student RSVP flow
  listLiveClassesForStudent: ListLiveClassesForStudent;
  rsvpLiveClass: RsvpLiveClass;
  cancelLiveClassRsvp: CancelLiveClassRsvp;
  // STORY-100: live-class recording + post-class XP
  markLiveClassRecordingWatched: MarkLiveClassRecordingWatched;
  // STORY-098: download center resources
  createResource: CreateResource;
  updateResource: UpdateResource;
  deleteResource: DeleteResource;
  adminListResources: AdminListResources;
  adminGetResource: AdminGetResource;
  listAvailableResources: ListAvailableResources;
  recordResourceDownload: RecordResourceDownload;
  purgeResource: PurgeResource;
  uploadFile: UploadFile;
  deleteFile: DeleteFile;
}

// ΓöÇΓöÇ Production container builder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();
  const logger: Logger = new PinoLogger(process.env.LOG_LEVEL);
  const databaseHealthCheck: DatabaseHealthCheck = new PrismaDatabaseHealthCheck(prisma);

  const userRepo: UserRepository = new PrismaUserRepository(prisma);
  // P0-2: course data now persists to PostgreSQL. The catalog
  // survives restarts and is shared across application instances.
  const courseRepo: CourseRepository = new PrismaCourseRepository(prisma);
  // P0-2 follow-up: module/lesson data now persists to PostgreSQL.
  const moduleRepo: IModuleRepository = new PrismaModuleRepository(prisma);
  const lessonRepo: ILessonRepository = new PrismaLessonRepository(prisma);
  // Audit hardening: keeps Course.curriculum in sync with Module/Lesson edits
  const rebuildCourseCurriculum = new RebuildCourseCurriculum({
    courseRepo,
    moduleRepo,
    lessonRepo,
  });
  const orderRepo: IOrderRepository = new PrismaOrderRepository(prisma);

  const enrollmentRepo: IEnrollmentRepository = new PrismaEnrollmentRepository(prisma);
  const discountCodeRepo: IDiscountCodeRepository = new PrismaDiscountCodeRepository(prisma);
  const quizRepo: IQuizRepository = new PrismaQuizRepository(prisma);
  const quizAttemptRepo: IQuizAttemptRepository = new PrismaQuizAttemptRepository(prisma);
  const xpEventRepo: IXPEventRepository = new PrismaXPEventRepository(prisma);
  const badgeRepo: IBadgeRepository = new PrismaBadgeRepository(prisma);
  const badgeAwardRepo: IBadgeAwardRepository = new PrismaBadgeAwardRepository(prisma);
  const certificateRepo: ICertificateRepository = new PrismaCertificateRepository(prisma);
  // STORY-096: was never wired into either container before this fix.
  const progressEventRepo: IProgressEventRepository = new PrismaProgressEventRepository(prisma);
  const sessionRepo: SessionRepository = new PrismaSessionRepository(prisma);
  const emailVerificationRepo: EmailVerificationRepository = new PrismaEmailVerificationRepository(
    prisma,
  );
  const passwordResetRepo: PasswordResetRepository = new PrismaPasswordResetRepository(prisma);
  const sentReminderRepo: SentReminderRepository = new PrismaSentReminderRepository(prisma);
  const verificationEmailRenderer = new EmailVerificationTemplateRenderer();
  const liveClassReminderRenderer = new LiveClassReminderTemplateRenderer();
  const passwordResetEmailRenderer = new PasswordResetTemplateRenderer();
  const welcomeEmailRenderer = new WelcomeTemplateRenderer();
  const passwordChangedEmailRenderer = new PasswordChangedTemplateRenderer();
  const certificateEmailRenderer = new CertificateEmailTemplateRenderer();
  const receiptEmailRenderer = new ReceiptTemplateRenderer();
  const refundEmailRenderer = new RefundTemplateRenderer();
  // STORY-050a: audit log (Postgres-backed in production via PrismaAuditLog)
  const auditLog: IAuditLog = new PrismaAuditLog(prisma);
  const recordAuditLog = new RecordAuditLog({ auditLog, idGen, clock });
  // Audit hardening: persistent webhook event log (Postgres-backed in production)
  const webhookEventLog: IWebhookEventLog = new PrismaWebhookEventLog(prisma);
  const listAuditLogs = new ListAuditLogs({ auditLog });
  const exportAuditLogs = new ExportAuditLogs({ auditLog });
  const scenarioRepo: ISimulatorScenarioRepository = new PrismaSimulatorScenarioRepository(prisma);
  // STORY-064: simulator attempt infrastructure
  const simulatorAttemptRepo: ISimulatorAttemptRepository = new PrismaSimulatorAttemptRepository(
    prisma,
  );
  // STORY-065: scoring engine
  const scorePolicyRepo: IScorePolicyRepository = new PrismaScorePolicyRepository(prisma);
  // STORY-066: feedback composer + remediation
  const feedbackRepo: IAttemptFeedbackRepository = new PrismaAttemptFeedbackRepository(prisma);
  const liveClassRepo: ILiveClassRepository = new PrismaLiveClassRepository(prisma);
  // Postgres-backed — RSVPs used to live only in-memory
  // (InMemoryLiveClassRegistrationRepository), so every cold start or
  // redeploy silently dropped them. Fixed independently on both `main`
  // (PR #275, "Proposal 3") and this branch (STORY-100); this branch's
  // adapter wins the merge since it also maps `watchedRecordingAt`.
  const liveClassRegistrationRepo: ILiveClassRegistrationRepository =
    new PrismaLiveClassRegistrationRepository(prisma);
  // STORY-098: download center resources
  const resourceRepo: IResourceRepository = new PrismaResourceRepository(prisma);
  // STORY-098.5: Vercel Blob when a store is provisioned (BLOB_READ_WRITE_TOKEN set),
  // otherwise LocalFileStorage — viable for local dev, NOT for production on Vercel's
  // read-only serverless filesystem. See LocalFileStorage's docblock.
  const fileStorage: IFileStorage = process.env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobFileStorage(process.env.BLOB_READ_WRITE_TOKEN)
    : new LocalFileStorage();
  // STORY-011: pricing tier repo
  const pricingTierRepo: IPricingTierRepository = new PrismaPricingTierRepository(prisma);
  // STORY-081: no DB table yet -- see StaticKeywordDatasetRepository's docblock
  const keywordDatasetRepo: KeywordDatasetRepository = new StaticKeywordDatasetRepository();
  // STORY-095: admin email template editor
  const emailTemplateRepo: IEmailTemplateRepository = new PrismaEmailTemplateRepository(prisma);

  const paymentGateway: IPaymentGateway = new PayMongoAdapter(
    process.env.PAYMONGO_SECRET ?? "",
    process.env.PAYMONGO_WEBHOOK_SECRET,
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const accessPolicy: IAccessPolicy = new TierAccessPolicy(userRepo, courseRepo, enrollmentRepo);
  const certificateHashGen: CertificateHashGenerator = new NodeCertificateHashGenerator();
  const certificateRenderer: CertificateRenderer = new ReactPdfCertificateRenderer();
  // STORY-012: bounded LRU cache (default 500 entries). Each entry
  // is a React element + frontmatter + HTML; 500 is a generous
  // upper bound for the AMPH catalog (9 modules * ~5 lessons = 45
  // distinct MDX strings today, will grow to maybe 200 max).
  const mdxRenderer: IMdxContentRenderer = new NextMdxRenderer();

  const emailSender: EmailSender = new ResendEmailSender(
    process.env.RESEND_API_KEY ?? "",
    process.env.EMAIL_FROM ?? "Project Amazon PH Academy <noreply@projectamazonph.online>",
  );

  const jwt: JwtService = new JoseJwtService(
    process.env.JWT_SECRET ?? "dev-only-secret-please-replace-with-32-bytes-min",
  );
  const passwordHasher: PasswordHasher = new Argon2PasswordHasher();
  const totpService: TotpService = new OtpauthTotpService();
  const rateLimiter: RateLimiter = new UpstashRateLimiter(
    process.env.UPSTASH_REDIS_REST_URL ?? "",
    process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  );

  // STORY-008: password reset. Hoisted (not built inline in the returned
  // object below) so adminGrantSubscription can reuse this same instance
  // to send new accounts a "set your password" email.
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

  // STORY-049 + STORY-062: build RefundOverride once. Both the
  // `refundOverride` container entry and `adminProcessRefund` (which
  // delegates to it) share the same instance ΓÇö that keeps a single
  // audit-log context and avoids two RefundOverride objects racing
  // over the same recordAuditLog port.
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
    logger,
    userRepo,
    sessionRepo,
    courseRepo,
    orderRepo,
    enrollmentRepo,
    paymentGateway,
    jwt,
    passwordHasher,
    rateLimiter,
    signUp: new SignUp(userRepo, idGen, clock, passwordHasher, recordAuditLog),
    login: new Login(userRepo, passwordHasher, sessionRepo, idGen, clock, jwt, totpService),
    logout: new Logout(sessionRepo, jwt),
    totpService,
    enableTwoFactor: new EnableTwoFactor({ userRepo, totpService }),
    confirmTwoFactor: new ConfirmTwoFactor({ userRepo, totpService, recordAuditLog }),
    disableTwoFactor: new DisableTwoFactor({ userRepo, hasher: passwordHasher, recordAuditLog }),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl,
    }),
    checkCourseAccess: new CheckCourseAccess(accessPolicy),
    // P0-5: per-lesson access decision
    authorizeLessonAccess: new AuthorizeLessonAccess({
      userRepo,
      courseRepo,
      enrollmentRepo,
    }),
    enrollStudent: new EnrollStudent({
      userRepo,
      courseRepo,
      enrollmentRepo,
      orderRepo,
      idGen,
    }),
    discountCodeRepo,
    applyDiscountCode: new ApplyDiscountCode({
      discountCodeRepo,
      clock,
    }),
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
      clock,
    }),
    // STORY-091: admin quiz CRUD
    adminListQuizzes: new AdminListQuizzes({ quizRepo, courseRepo }),
    adminGetQuiz: new AdminGetQuiz({ quizRepo, courseRepo }),
    adminCreateQuiz: new AdminCreateQuiz({ quizRepo, recordAuditLog }),
    adminUpdateQuiz: new AdminUpdateQuiz({ quizRepo, recordAuditLog }),
    adminDeleteQuiz: new AdminDeleteQuiz({ quizRepo, quizAttemptRepo, recordAuditLog }),
    quizRepo,
    quizAttemptRepo,
    xpEventRepo,
    badgeRepo,
    badgeAwardRepo,
    recordQuizAttempt: new RecordQuizAttempt({
      quizRepo,
      quizAttemptRepo,
      xpEventRepo,
      userRepo,
      idGen,
      clock,
    }),
    awardXp: new AwardXP({ xpEventRepo, userRepo, idGen, clock }),
    awardBadge: new AwardBadge({
      badgeRepo,
      badgeAwardRepo,
      awardXp: new AwardXP({ xpEventRepo, userRepo, idGen, clock }),
      idGen,
    }),
    listUserBadges: new ListUserBadges({ badgeRepo, badgeAwardRepo }),
    certificateRepo,
    progressEventRepo,
    certificateHashGen,
    certificateRenderer,
    mdxRenderer,
    emailSender,
    receiptEmailRenderer,
    simulatorRegistry: buildSimulatorRegistry(),
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
      idGen,
      passwordHasher,
      recordAuditLog,
      requestPasswordReset,
      logger,
    }),
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
    auditLog,
    recordAuditLog,
    listAuditLogs,
    exportAuditLogs,
    webhookEventLog,
    rebuildCourseCurriculum,
    scenarioRepo,
    simulatorAttemptRepo,
    scorePolicyRepo,
    feedbackRepo,
    // STORY-064: simulator attempt lifecycle
    startSimulatorAttempt: new StartSimulatorAttempt({
      attemptRepo: simulatorAttemptRepo,
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
      clock,
    }),
    composeAttemptFeedback: new ComposeAttemptFeedback({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    }),
    checkChallengeModeUnlocked: new CheckChallengeModeUnlocked({
      attemptRepo: simulatorAttemptRepo,
      scorePolicyRepo,
    }),
    // STORY-011: pricing tier repo
    pricingTierRepo,
    // STORY-048b/c: module + lesson repos (also used by public catalog)
    moduleRepo,
    lessonRepo,
    // STORY-081: keyword dataset lookup for the Keyword Research simulator
    keywordDatasetRepo,
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
    // STORY-050c
    liveClassRegistrationRepo,
    liveClassRepo,
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
    // STORY-090/091: live class student flow
    listLiveClassesForStudent: new ListLiveClassesForStudent({
      liveClassRepo,
      liveClassRegistrationRepo,
      enrollmentRepo,
    }),
    rsvpLiveClass: new RsvpLiveClass({
      liveClassRepo,
      liveClassRegistrationRepo,
      ids: idGen,
      clock,
    }),
    cancelLiveClassRsvp: new CancelLiveClassRsvp({
      liveClassRegistrationRepo,
      clock,
    }),
    markLiveClassRecordingWatched: new MarkLiveClassRecordingWatched({
      liveClassRepo,
      liveClassRegistrationRepo,
      awardXp: new AwardXP({ xpEventRepo, userRepo, idGen, clock }),
      clock,
    }),
    // STORY-098: download center resources
    resourceRepo,
    fileStorage,
    createResource: new CreateResource({ resourceRepo, recordAuditLog }),
    updateResource: new UpdateResource({ resourceRepo, fileStorage, recordAuditLog }),
    deleteResource: new DeleteResource({ resourceRepo, recordAuditLog }),
    adminListResources: new AdminListResources({ resourceRepo }),
    adminGetResource: new AdminGetResource({ resourceRepo }),
    listAvailableResources: new ListAvailableResources({ resourceRepo }),
    recordResourceDownload: new RecordResourceDownload({ resourceRepo, recordAuditLog }),
    // STORY-098.5: download center file upload/management
    purgeResource: new PurgeResource({ resourceRepo, fileStorage, recordAuditLog }),
    uploadFile: new UploadFile({ fileStorage }),
    deleteFile: new DeleteFile({ fileStorage }),
  };
}

// ΓöÇΓöÇ Request-scoped storage ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const containerStore = new AsyncLocalStorage<AppContainer>();

export function runWithContainer<T>(container: AppContainer, fn: () => T): T {
  return containerStore.run(container, fn);
}

export function getContainer(): AppContainer {
  const c = containerStore.getStore();
  if (!c) {
    throw new Error(
      "getContainer() called outside a request scope with a container. " +
        "Did you forget runWithContainer() in middleware, or are you " +
        "calling this from a Server Component at the page level? " +
        "Pages should call buildContainer() directly.",
    );
  }
  return c;
}

// ΓöÇΓöÇ Cached production singleton ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// ── Startup env-var validation ──────────────────────────────────────────────

function validateRequiredEnvVars(): void {
  if (!process.env.PAYMONGO_SECRET) {
    throw new Error("Missing required environment variable: PAYMONGO_SECRET");
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
}

let _productionContainer: AppContainer | null = null;

export function buildContainer(): AppContainer {
  validateRequiredEnvVars();
  if (!_productionContainer) {
    _productionContainer = buildProductionContainer();
  }
  return _productionContainer;
}

// ΓöÇΓöÇ Re-exports for test code ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
//
// Test code imports `buildTestContainer` (and the TestContainer type)
// directly from "./container.test" to make the dependency explicit.
// We intentionally do NOT re-export from here ΓÇö keeping the test
// container in its own file is what keeps the in-memory adapters (and
// their react-dom/server import) out of the production bundle.

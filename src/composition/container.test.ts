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
// and is fast in-process — no need for a separate test double.
import type { IMdxContentRenderer } from "@/ports/rendering/IMdxContentRenderer";
import { NextMdxRenderer } from "@/infra/rendering/NextMdxRenderer";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";

import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEmailVerificationRepository } from "@/infra/db/inmemory/InMemoryEmailVerificationRepository";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
import { InMemorySentReminderRepository } from "@/infra/db/inmemory/InMemorySentReminderRepository";
import { EmailVerificationTemplateRenderer } from "@/infra/email/templates/EmailVerificationRenderer";
import { LiveClassReminderTemplateRenderer } from "@/infra/email/templates/LiveClassReminderRenderer";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryBadgeAwardRepository } from "@/infra/repositories/InMemoryBadgeAwardRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { StubAccessPolicy } from "@/infra/access/StubAccessPolicy";
import { FakeCertificateHashGenerator } from "@/infra/security/FakeCertificateHashGenerator";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { InMemoryRateLimiter } from "@/infra/security/InMemoryRateLimiter";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import { SignUp } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import { Logout } from "@/usecases/Logout";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { AuthorizeLessonAccess } from "@/usecases/AuthorizeLessonAccess";
import { ApplyDiscountCode } from "@/usecases/ApplyDiscountCode";
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import { AwardXP } from "@/usecases/AwardXP";
import { AwardBadge } from "@/usecases/AwardBadge";
import { ListUserBadges } from "@/usecases/ListUserBadges";
import { IssueCertificate } from "@/usecases/IssueCertificate";
import { RenderCertificatePdf } from "@/usecases/RenderCertificatePdf";
import { VerifyCertificate } from "@/usecases/VerifyCertificate";
import { RevokeCertificate } from "@/usecases/RevokeCertificate";
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
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
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
import { AdminListScenarios } from "@/usecases/AdminListScenarios";
import { GetSimulatorScenario } from "@/usecases/GetSimulatorScenario";
import { CreateSimulatorScenario } from "@/usecases/CreateSimulatorScenario";
import { UpdateSimulatorScenario } from "@/usecases/UpdateSimulatorScenario";
import { ArchiveSimulatorScenario } from "@/usecases/ArchiveSimulatorScenario";
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

import type { AppContainer } from "./container";

// TestContainer narrows the AppContainer's port types to the concrete
// in-memory adapters. Tests need this so they can call test-only methods
// like .users.set(...) or .seed() on the in-memory repos.
export interface TestContainer extends AppContainer {
  logger: TestLogger;
  rateLimiter: InMemoryRateLimiter;
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
  badgeRepo: InMemoryBadgeRepository;
  badgeAwardRepo: InMemoryBadgeAwardRepository;
  certificateRepo: InMemoryCertificateRepository;
  certificateRenderer: StaticCertificateRenderer;
  // STORY-012: tests share NextMdxRenderer with production.
  mdxRenderer: IMdxContentRenderer;
  accessPolicy: StubAccessPolicy;
  auditLog: InMemoryAuditLog;
  scenarioRepo: InMemorySimulatorScenarioRepository;
  liveClassRepo: InMemoryLiveClassRepository;
  pricingTierRepo: InMemoryPricingTierRepository;
  sentReminderRepo: InMemorySentReminderRepository;
  emailVerificationRepo: InMemoryEmailVerificationRepository;
  passwordResetRepo: InMemoryPasswordResetRepository;
}

export function buildTestContainer(): TestContainer {
  const clock = new FixedClock(new Date());
  const idGen = new InMemoryIdGenerator();
  const logger = new TestLogger();
  const rateLimiter = new InMemoryRateLimiter();
  const userRepo = new InMemoryUserRepository();
  const courseRepo = new InMemoryCourseRepository();
  const moduleRepo = new InMemoryModuleRepository();
  const lessonRepo = new InMemoryLessonRepository();
  const orderRepo = new InMemoryOrderRepository();
  const enrollmentRepo = new InMemoryEnrollmentRepository();
  const discountCodeRepo = new InMemoryDiscountCodeRepository();
  const quizRepo = new InMemoryQuizRepository();
  const quizAttemptRepo = new InMemoryQuizAttemptRepository();
  const xpEventRepo = new InMemoryXPEventRepository();
  const badgeRepo = new InMemoryBadgeRepository();
  const badgeAwardRepo = new InMemoryBadgeAwardRepository();
  const certificateRepo = new InMemoryCertificateRepository();
  const sessionRepo = new InMemorySessionRepository();
  const emailVerificationRepo = new InMemoryEmailVerificationRepository();
  const passwordResetRepo = new InMemoryPasswordResetRepository();
  const sentReminderRepo = new InMemorySentReminderRepository();
  const verificationEmailRenderer = new EmailVerificationTemplateRenderer();
  const liveClassReminderRenderer = new LiveClassReminderTemplateRenderer();
  const paymentGateway: IPaymentGateway = new StubPaymentGateway();
  const accessPolicy = new StubAccessPolicy();
  const certificateHashGen: CertificateHashGenerator = new FakeCertificateHashGenerator();
  const certificateRenderer: CertificateRenderer = new StaticCertificateRenderer();
  // STORY-012: same NextMdxRenderer as production. No IO, no
  // stub needed — the test container just hands every test a
  // shared, fresh instance with no state leaking between suites.
  const mdxRenderer: IMdxContentRenderer = new NextMdxRenderer();
  const emailSender: EmailSender = new InMemoryEmailSender();
  const jwt: JwtService = new JoseJwtService(
    process.env.JWT_SECRET ?? "test-secret-must-be-at-least-32-bytes-long-ok",
  );
  const passwordHasher: PasswordHasher = new Argon2PasswordHasher();
  // STORY-050a: audit log
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({ auditLog, idGen, clock });
  // STORY-050b: simulator scenario repo
  const scenarioRepo = new InMemorySimulatorScenarioRepository();
  // STORY-050c: live class repo
  const liveClassRepo = new InMemoryLiveClassRepository();
  // STORY-011: pricing tier repo
  const pricingTierRepo = new InMemoryPricingTierRepository();

  return {
    clock,
    idGen,
    emailVerificationRepo,
    passwordResetRepo,
    logger,
    rateLimiter,
    userRepo,
    sessionRepo,
    courseRepo,
    moduleRepo,
    lessonRepo,
    orderRepo,
    enrollmentRepo,
    paymentGateway,
    jwt,
    passwordHasher,
    signUp: new SignUp(userRepo, idGen, clock, passwordHasher),
    login: new Login(userRepo, passwordHasher, sessionRepo, idGen, clock, jwt),
    logout: new Logout(sessionRepo, jwt),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl: "https://test.amph.example.com",
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
    quizRepo,
    quizAttemptRepo,
    xpEventRepo,
    badgeRepo,
    badgeAwardRepo,
    certificateRepo,
    certificateHashGen,
    certificateRenderer,
    mdxRenderer,
    emailSender,
    accessPolicy,
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
    issueCertificate: new IssueCertificate({
      enrollmentRepo,
      courseRepo,
      certificateRepo,
      hashGen: certificateHashGen,
      idGen,
      clock,
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
    createModule: new CreateModule({ moduleRepo, idGen, clock, recordAuditLog }),
    updateModule: new UpdateModule({ moduleRepo, clock, recordAuditLog }),
    deleteModule: new DeleteModule({ moduleRepo, recordAuditLog }),
    reorderModules: new ReorderModules({ moduleRepo, recordAuditLog }),
    // STORY-048c: admin lessons CRUD + reorder
    adminListLessons: new AdminListLessons({ lessonRepo }),
    adminGetLesson: new AdminGetLesson({ lessonRepo }),
    createLesson: new CreateLesson({ lessonRepo, idGen, clock, recordAuditLog }),
    updateLesson: new UpdateLesson({ lessonRepo, clock, recordAuditLog }),
    deleteLesson: new DeleteLesson({ lessonRepo, recordAuditLog }),
    reorderLessons: new ReorderLessons({ lessonRepo, recordAuditLog }),
    // STORY-049: admin payments + refunds + refund override
    adminListPayments: new AdminListPayments({ orderRepo, userRepo }),
    adminGetPayment: new AdminGetPayment({ orderRepo, userRepo, courseRepo }),
    processRefund: new ProcessRefund({ orderRepo, paymentGateway, clock }),
    refundOverride: new RefundOverride({ orderRepo, paymentGateway, recordAuditLog }),
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
    simulatorRegistry: buildSimulatorRegistry(),
    auditLog,
    recordAuditLog,
    scenarioRepo,
    // STORY-050b: simulator scenario CRUD
    adminListScenarios: new AdminListScenarios({ scenarioRepo }),
    getSimulatorScenario: new GetSimulatorScenario({ scenarioRepo }),
    createSimulatorScenario: new CreateSimulatorScenario({ scenarioRepo, recordAuditLog }),
    updateSimulatorScenario: new UpdateSimulatorScenario({ scenarioRepo, recordAuditLog }),
    archiveSimulatorScenario: new ArchiveSimulatorScenario({ scenarioRepo, recordAuditLog }),
    // STORY-050c
    liveClassRepo,
    pricingTierRepo,
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
    }),
    // STORY-008: password reset
    requestPasswordReset: new RequestPasswordReset({
      users: userRepo,
      passwordResets: passwordResetRepo,
      email: emailSender,
      rateLimiter,
      clock,
      ids: idGen,
      logger,
    }),
    resetPassword: new ResetPassword({
      users: userRepo,
      passwordResets: passwordResetRepo,
      sessions: sessionRepo,
      clock,
      logger,
      email: emailSender,
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
    }),
  };
}

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

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
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
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { StubAccessPolicy } from "@/infra/access/StubAccessPolicy";
import { FakeCertificateHashGenerator } from "@/infra/security/FakeCertificateHashGenerator";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import { SignUp } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import { Logout } from "@/usecases/Logout";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { EnrollStudent } from "@/usecases/EnrollStudent";
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

import type { AppContainer } from "./container";

// TestContainer narrows the AppContainer's port types to the concrete
// in-memory adapters. Tests need this so they can call test-only methods
// like .users.set(...) or .seed() on the in-memory repos.
export interface TestContainer extends AppContainer {
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
  accessPolicy: StubAccessPolicy;
}

export function buildTestContainer(): TestContainer {
  const clock = new FixedClock(new Date());
  const idGen = new InMemoryIdGenerator();
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
  const paymentGateway: IPaymentGateway = new StubPaymentGateway();
  const accessPolicy = new StubAccessPolicy();
  const certificateHashGen: CertificateHashGenerator = new FakeCertificateHashGenerator();
  const certificateRenderer: CertificateRenderer = new StaticCertificateRenderer();
  const emailSender: EmailSender = new InMemoryEmailSender();
  const jwt: JwtService = new JoseJwtService(
    process.env.JWT_SECRET ?? "test-secret-must-be-at-least-32-bytes-long-ok",
  );
  const passwordHasher: PasswordHasher = new Argon2PasswordHasher();

  return {
    clock,
    idGen,
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
    login: new Login(
      userRepo,
      passwordHasher,
      sessionRepo,
      idGen,
      clock,
      jwt,
    ),
    logout: new Logout(sessionRepo, jwt),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl: "https://test.amph.example.com",
    }),
    checkCourseAccess: new CheckCourseAccess(accessPolicy),
    enrollStudent: new EnrollStudent({
      userRepo,
      courseRepo,
      enrollmentRepo,
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
    createCourse: new CreateCourse({ courseRepo }),
    updateCourse: new UpdateCourse({ courseRepo }),
    archiveCourse: new ArchiveCourse({ courseRepo }),
    // STORY-048b: admin modules CRUD + reorder
    adminListModules: new AdminListModules({ moduleRepo }),
    adminGetModule: new AdminGetModule({ moduleRepo }),
    createModule: new CreateModule({ moduleRepo, idGen, clock }),
    updateModule: new UpdateModule({ moduleRepo, clock }),
    deleteModule: new DeleteModule({ moduleRepo }),
    reorderModules: new ReorderModules({ moduleRepo }),
    // STORY-048c: admin lessons CRUD + reorder
    adminListLessons: new AdminListLessons({ lessonRepo }),
    adminGetLesson: new AdminGetLesson({ lessonRepo }),
    createLesson: new CreateLesson({ lessonRepo, idGen, clock }),
    updateLesson: new UpdateLesson({ lessonRepo, clock }),
    deleteLesson: new DeleteLesson({ lessonRepo }),
    reorderLessons: new ReorderLessons({ lessonRepo }),
    // STORY-049: admin payments + refunds + refund override
    adminListPayments: new AdminListPayments({ orderRepo, userRepo }),
    adminGetPayment: new AdminGetPayment({ orderRepo, userRepo, courseRepo }),
    processRefund: new ProcessRefund({ orderRepo, paymentGateway, clock }),
    refundOverride: new RefundOverride({ orderRepo, paymentGateway }),
    simulatorRegistry: buildSimulatorRegistry(),
  };
}

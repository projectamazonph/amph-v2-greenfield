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

// ── System ports ───────────────────────────────────────────────

import { SystemClock } from "@/ports/system/Clock";
import type { Clock } from "@/ports/system/Clock";

import { UlidGenerator } from "@/infra/system/UlidGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";

// ── Repository ports (interfaces) ──────────────────────────────

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
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { IAuditLog } from "@/ports/repositories/IAuditLog";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";

// ── Production adapters (only the prod ones) ──────────────────

import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";
import { PrismaCourseRepository } from "@/infra/repositories/PrismaCourseRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
// Note: SessionRepository is currently in-memory even in production
// (PrismaSessionRepository is a future story). The session is also
// embedded in the JWT cookie, so losing the DB row on process restart
// does not invalidate active sessions — the JWT is still valid until
// its expiry. The DB row is for admin visibility + revocation; when
// revocation matters, ship the Prisma adapter.
import { PrismaEnrollmentRepository } from "@/infra/repositories/PrismaEnrollmentRepository";
import { PrismaDiscountCodeRepository } from "@/infra/repositories/PrismaDiscountCodeRepository";
import { PrismaQuizRepository } from "@/infra/repositories/PrismaQuizRepository";
import { PrismaQuizAttemptRepository } from "@/infra/repositories/PrismaQuizAttemptRepository";
import { PrismaXPEventRepository } from "@/infra/repositories/PrismaXPEventRepository";
import { PrismaBadgeRepository } from "@/infra/repositories/PrismaBadgeRepository";
import { PrismaBadgeAwardRepository } from "@/infra/repositories/PrismaBadgeAwardRepository";
import { PrismaCertificateRepository } from "@/infra/repositories/PrismaCertificateRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { prisma } from "@/infra/database/prisma";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import { NodeCertificateHashGenerator } from "@/infra/security/NodeCertificateHashGenerator";

import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";
import { ReactPdfCertificateRenderer } from "@/infra/pdf/ReactPdfCertificateRenderer";

import type { EmailSender } from "@/ports/email/EmailSender";
import { ResendEmailSender } from "@/infra/email/ResendEmailSender";
// InMemoryEmailSender is NOT imported here — it would pull in
// react-dom/server and break `next build`. Test code uses it via
// ./container.test.ts.

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";

import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

// ── Use cases ───────────────────────────────────────────────

import { SignUp } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import { Logout } from "@/usecases/Logout";
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
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import { AwardXP } from "@/usecases/AwardXP";
import { AwardBadge } from "@/usecases/AwardBadge";
import type { SimulatorRegistry } from "@/ports/simulator/SimulatorRegistry";
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
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
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

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import { TierAccessPolicy } from "@/infra/access/TierAccessPolicy";

// ── Container shape ─────────────────────────────────────────

export interface AppContainer {
  // System
  clock: Clock;
  idGen: IdGenerator;

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
  auditLog: IAuditLog;
  scenarioRepo: ISimulatorScenarioRepository;
  // STORY-050c: live class admin CRUD
  liveClassRepo: ILiveClassRepository;
  simulatorRegistry: SimulatorRegistry;

  // External services
  paymentGateway: IPaymentGateway;
  certificateHashGen: CertificateHashGenerator;
  certificateRenderer: CertificateRenderer;
  emailSender: EmailSender;
  jwt: JwtService;
  passwordHasher: PasswordHasher;

  // Use cases
  signUp: SignUp;
  login: Login;
  logout: Logout;
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
  recordQuizAttempt: RecordQuizAttempt;
  awardXp: AwardXP;
  awardBadge: AwardBadge;
  listUserBadges: ListUserBadges;
  issueCertificate: IssueCertificate;
  renderCertificatePdf: RenderCertificatePdf;
  verifyCertificate: VerifyCertificate;
  revokeCertificate: RevokeCertificate;
  getAdminDashboardStats: GetAdminDashboardStats;
  listCourses: ListCourses;
  getCourse: GetCourse;
  // STORY-047: admin users list + user detail + impersonate
  listUsers: ListUsers;
  getUserDetail: GetUserDetail;
  impersonateUser: ImpersonateUser;
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
  // STORY-050a: audit log
  recordAuditLog: RecordAuditLog;
  // STORY-050b: simulator scenario CRUD
  adminListScenarios: AdminListScenarios;
  getSimulatorScenario: GetSimulatorScenario;
  createSimulatorScenario: CreateSimulatorScenario;
  updateSimulatorScenario: UpdateSimulatorScenario;
  archiveSimulatorScenario: ArchiveSimulatorScenario;
  // STORY-050c: live class admin CRUD
  adminListLiveClasses: AdminListLiveClasses;
  adminGetLiveClass: AdminGetLiveClass;
  createLiveClass: CreateLiveClass;
  updateLiveClass: UpdateLiveClass;
  deleteLiveClass: DeleteLiveClass;
}

// ── Production container builder ─────────────────────────────

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();

  const userRepo: UserRepository = new PrismaUserRepository(prisma);
  // P0-2: course data now persists to PostgreSQL. The catalog
  // survives restarts and is shared across application instances.
  const courseRepo: CourseRepository = new PrismaCourseRepository(prisma);
  // STORY-048b: Module repo is also in-memory (no Prisma module table
  // yet). The story's 'Prisma Module schema migration' out-of-scope
  // item is the follow-up.
  const moduleRepo: IModuleRepository = new InMemoryModuleRepository();
  // STORY-048c: same in-memory fallback as Module.
  const lessonRepo: ILessonRepository = new InMemoryLessonRepository();
  const orderRepo: IOrderRepository = new InMemoryOrderRepository();

  const enrollmentRepo: IEnrollmentRepository = new PrismaEnrollmentRepository(prisma);
  // STORY-050d: use in-memory discount code repo (Prisma schema is a follow-up)
  const discountCodeRepo: IDiscountCodeRepository = new InMemoryDiscountCodeRepository();
  const quizRepo: IQuizRepository = new PrismaQuizRepository(prisma);
  const quizAttemptRepo: IQuizAttemptRepository = new PrismaQuizAttemptRepository(prisma);
  const xpEventRepo: IXPEventRepository = new PrismaXPEventRepository(prisma);
  const badgeRepo: IBadgeRepository = new PrismaBadgeRepository(prisma);
  const badgeAwardRepo: IBadgeAwardRepository = new PrismaBadgeAwardRepository(prisma);
  const certificateRepo: ICertificateRepository = new PrismaCertificateRepository(prisma);
  const sessionRepo: SessionRepository = new InMemorySessionRepository();
  // STORY-050a: audit log (in-memory in prod until the Prisma schema lands)
  const auditLog: IAuditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({ auditLog, idGen, clock });
  // STORY-050b: simulator scenario repo (in-memory in prod until Prisma schema lands)
  const scenarioRepo: ISimulatorScenarioRepository = new InMemorySimulatorScenarioRepository();
  // STORY-050c: in-memory live class repo (Prisma schema is a follow-up)
  const liveClassRepo: ILiveClassRepository = new InMemoryLiveClassRepository();

  const paymentGateway: IPaymentGateway = new PayMongoAdapter(
    process.env.PAYMONGO_SECRET ?? "",
    process.env.PAYMONGO_WEBHOOK_SECRET,
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const accessPolicy: IAccessPolicy = new TierAccessPolicy(userRepo, courseRepo);
  const certificateHashGen: CertificateHashGenerator = new NodeCertificateHashGenerator();
  const certificateRenderer: CertificateRenderer = new ReactPdfCertificateRenderer();

  const emailSender: EmailSender = new ResendEmailSender(
    process.env.RESEND_API_KEY ?? "",
    process.env.EMAIL_FROM ?? "AMPH Academy <noreply@amph.example.com>",
  );

  const jwt: JwtService = new JoseJwtService(
    process.env.JWT_SECRET ?? "dev-only-secret-please-replace-with-32-bytes-min",
  );
  const passwordHasher: PasswordHasher = new Argon2PasswordHasher();

  return {
    clock,
    idGen,
    userRepo,
    sessionRepo,
    courseRepo,
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
    adminCreateDiscountCode: new AdminCreateDiscountCode({ discountCodeRepo, idGen, recordAuditLog }),
    adminUpdateDiscountCode: new AdminUpdateDiscountCode({ discountCodeRepo, recordAuditLog }),
    adminArchiveDiscountCode: new AdminArchiveDiscountCode({ discountCodeRepo, recordAuditLog }),
    // STORY-050e: admin badge CRUD
    adminListBadges: new AdminListBadges({ badgeRepo }),
    adminGetBadge: new AdminGetBadge({ badgeRepo }),
    adminCreateBadge: new AdminCreateBadge({ badgeRepo, recordAuditLog }),
    adminUpdateBadge: new AdminUpdateBadge({ badgeRepo, recordAuditLog }),
    adminArchiveBadge: new AdminArchiveBadge({ badgeRepo, recordAuditLog }),
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
    certificateHashGen,
    certificateRenderer,
    emailSender,
    simulatorRegistry: buildSimulatorRegistry(),
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
    createCourse: new CreateCourse({ courseRepo, recordAuditLog }),
    updateCourse: new UpdateCourse({ courseRepo, recordAuditLog }),
    archiveCourse: new ArchiveCourse({ courseRepo, recordAuditLog }),
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
    refundOverride: new RefundOverride({ orderRepo, paymentGateway, recordAuditLog }),
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
    adminListLiveClasses: new AdminListLiveClasses({ liveClassRepo }),
    adminGetLiveClass: new AdminGetLiveClass({ liveClassRepo }),
    createLiveClass: new CreateLiveClass({ liveClassRepo, recordAuditLog }),
    updateLiveClass: new UpdateLiveClass({ liveClassRepo, recordAuditLog }),
    deleteLiveClass: new DeleteLiveClass({ liveClassRepo, recordAuditLog }),
  };
}

// ── Request-scoped storage ─────────────────────────────────

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

// ── Cached production singleton ──────────────────────────────

let _productionContainer: AppContainer | null = null;

export function buildContainer(): AppContainer {
  if (!_productionContainer) {
    _productionContainer = buildProductionContainer();
  }
  return _productionContainer;
}

// ── Re-exports for test code ─────────────────────────────────
//
// Test code imports `buildTestContainer` (and the TestContainer type)
// directly from "./container.test" to make the dependency explicit.
// We intentionally do NOT re-export from here — keeping the test
// container in its own file is what keeps the in-memory adapters (and
// their react-dom/server import) out of the production bundle.



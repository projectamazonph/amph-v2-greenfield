/**
 * Composition root — the single place where all dependencies are wired together.
 *
 * ADR-020: This is the only module in the codebase that knows about all layers.
 * Everything else receives its dependencies via constructor injection.
 *
 * Two containers:
 * - buildContainer() — production: real infra adapters
 * - buildTestContainer() — test: in-memory fakes
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ── System ports ───────────────────────────────────────────────

import { SystemClock } from "@/ports/system/Clock";
import type { Clock } from "@/ports/system/Clock";

import { UlidGenerator } from "@/infra/system/UlidGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";

import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

// ── Repository ports ────────────────────────────────────────

import type { UserRepository } from "@/ports/repositories/UserRepository";
import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";
import { prisma } from "@/infra/database/prisma";

import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";

import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";

import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { PrismaEnrollmentRepository } from "@/infra/repositories/PrismaEnrollmentRepository";

import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { PrismaDiscountCodeRepository } from "@/infra/repositories/PrismaDiscountCodeRepository";

import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { PrismaQuizRepository } from "@/infra/repositories/PrismaQuizRepository";

import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { PrismaQuizAttemptRepository } from "@/infra/repositories/PrismaQuizAttemptRepository";

import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { PrismaXPEventRepository } from "@/infra/repositories/PrismaXPEventRepository";

import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { PrismaBadgeRepository } from "@/infra/repositories/PrismaBadgeRepository";

import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import { InMemoryBadgeAwardRepository } from "@/infra/repositories/InMemoryBadgeAwardRepository";
import { PrismaBadgeAwardRepository } from "@/infra/repositories/PrismaBadgeAwardRepository";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { PrismaCertificateRepository } from "@/infra/repositories/PrismaCertificateRepository";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import { NodeCertificateHashGenerator } from "@/infra/security/NodeCertificateHashGenerator";
import { FakeCertificateHashGenerator } from "@/infra/security/FakeCertificateHashGenerator";

import type { CertificateRenderer } from "@/ports/rendering/CertificateRenderer";
import { ReactPdfCertificateRenderer } from "@/infra/pdf/ReactPdfCertificateRenderer";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";

import type { EmailSender } from "@/ports/email/EmailSender";
import { ResendEmailSender } from "@/infra/email/ResendEmailSender";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";

// ── Payment ports ────────────────────────────────────────────

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";

// ── Use cases ───────────────────────────────────────────────

import { SignUp } from "@/usecases/SignUp";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import type { JwtService } from "@/ports/security/JwtService";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { ApplyDiscountCode } from "@/usecases/ApplyDiscountCode";
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

// ── Access policy ────────────────────────────────────────────

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import { TierAccessPolicy } from "@/infra/access/TierAccessPolicy";
import { StubAccessPolicy } from "@/infra/access/StubAccessPolicy";

// ── Container shape ─────────────────────────────────────────

export interface AppContainer {
  // System
  clock: Clock;
  idGen: IdGenerator;

  // Repositories
  userRepo: UserRepository;
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
  createPaymentIntent: CreatePaymentIntent;
  checkCourseAccess: CheckCourseAccess;
  enrollStudent: EnrollStudent;
  applyDiscountCode: ApplyDiscountCode;
  recordQuizAttempt: RecordQuizAttempt;
  awardXp: AwardXP;
  awardBadge: AwardBadge;
  listUserBadges: ListUserBadges;
  issueCertificate: IssueCertificate;
  renderCertificatePdf: RenderCertificatePdf;
  verifyCertificate: VerifyCertificate;
  revokeCertificate: RevokeCertificate;
  getAdminDashboardStats: GetAdminDashboardStats;
}

// ── Production container ─────────────────────────────────────

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();

  const userRepo: UserRepository = new PrismaUserRepository(prisma);
  const courseRepo: CourseRepository = new InMemoryCourseRepository();
  const orderRepo: IOrderRepository = new InMemoryOrderRepository();
  const enrollmentRepo: IEnrollmentRepository = new PrismaEnrollmentRepository(prisma);
  const discountCodeRepo: IDiscountCodeRepository = new PrismaDiscountCodeRepository(prisma);
  const quizRepo: IQuizRepository = new PrismaQuizRepository(prisma);
  const quizAttemptRepo: IQuizAttemptRepository = new PrismaQuizAttemptRepository(prisma);
  const xpEventRepo: IXPEventRepository = new PrismaXPEventRepository(prisma);
  const badgeRepo: IBadgeRepository = new PrismaBadgeRepository(prisma);
  const badgeAwardRepo: IBadgeAwardRepository = new PrismaBadgeAwardRepository(prisma);
  const certificateRepo: ICertificateRepository = new PrismaCertificateRepository(prisma);

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
    courseRepo,
    orderRepo,
    enrollmentRepo,
    paymentGateway,
    jwt,
    passwordHasher,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl,
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
  };
}

// ── Test container ──────────────────────────────────────────

export interface TestContainer extends AppContainer {
  userRepo: InMemoryUserRepository;
  courseRepo: InMemoryCourseRepository;
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
  const orderRepo = new InMemoryOrderRepository();
  const enrollmentRepo = new InMemoryEnrollmentRepository();
  const discountCodeRepo = new InMemoryDiscountCodeRepository();
  const quizRepo = new InMemoryQuizRepository();
  const quizAttemptRepo = new InMemoryQuizAttemptRepository();
  const xpEventRepo = new InMemoryXPEventRepository();
  const badgeRepo = new InMemoryBadgeRepository();
  const badgeAwardRepo = new InMemoryBadgeAwardRepository();
  const certificateRepo = new InMemoryCertificateRepository();
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
    courseRepo,
    orderRepo,
    enrollmentRepo,
    paymentGateway,
    jwt,
    passwordHasher,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
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
    simulatorRegistry: buildSimulatorRegistry(),
  };
}

// ── Request-scoped storage ──────────────────────────────────

const containerStore = new AsyncLocalStorage<AppContainer>();

export function runWithContainer<T>(container: AppContainer, fn: () => T): T {
  return containerStore.run(container, fn);
}

/** Get the current request's container. Must be called inside a runWithContainer() context. */
export function getContainer(): AppContainer {
  const container = containerStore.getStore();
  if (!container) {
    throw new Error(
      "No container in scope. Are you calling getContainer() outside of a server action? " +
        "All container access must go through runWithContainer().",
    );
  }
  return container;
}

// ── Cached singleton ─────────────────────────────────────────

let _productionContainer: AppContainer | null = null;

export function buildContainer(): AppContainer {
  if (!_productionContainer) {
    _productionContainer = buildProductionContainer();
  }
  return _productionContainer;
}

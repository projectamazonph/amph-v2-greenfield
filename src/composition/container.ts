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
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";

// ── Production adapters (only the prod ones) ──────────────────

import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { PrismaEnrollmentRepository } from "@/infra/repositories/PrismaEnrollmentRepository";
import { PrismaDiscountCodeRepository } from "@/infra/repositories/PrismaDiscountCodeRepository";
import { PrismaQuizRepository } from "@/infra/repositories/PrismaQuizRepository";
import { PrismaQuizAttemptRepository } from "@/infra/repositories/PrismaQuizAttemptRepository";
import { PrismaXPEventRepository } from "@/infra/repositories/PrismaXPEventRepository";
import { PrismaBadgeRepository } from "@/infra/repositories/PrismaBadgeRepository";
import { PrismaBadgeAwardRepository } from "@/infra/repositories/PrismaBadgeAwardRepository";
import { PrismaCertificateRepository } from "@/infra/repositories/PrismaCertificateRepository";
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
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
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

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import { TierAccessPolicy } from "@/infra/access/TierAccessPolicy";

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

// ── Production container builder ─────────────────────────────

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();

  const userRepo: UserRepository = new PrismaUserRepository(prisma);
  // Course and order repos are intentionally in-memory even in prod
  // for now (see TODOs in STORY-013 / STORY-015). They will be moved
  // to Prisma when the curriculum + orders data needs to survive
  // process restarts.
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



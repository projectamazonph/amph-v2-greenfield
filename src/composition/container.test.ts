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
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryBadgeAwardRepository } from "@/infra/repositories/InMemoryBadgeAwardRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { StubAccessPolicy } from "@/infra/access/StubAccessPolicy";
import { FakeCertificateHashGenerator } from "@/infra/security/FakeCertificateHashGenerator";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { buildSimulatorRegistry } from "@/infra/simulator/buildSimulatorRegistry";

import { SignUp } from "@/usecases/SignUp";
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

import type { AppContainer } from "./container";

// TestContainer narrows the AppContainer's port types to the concrete
// in-memory adapters. Tests need this so they can call test-only methods
// like .users.set(...) or .seed() on the in-memory repos.
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

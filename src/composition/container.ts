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

// ── Payment ports ────────────────────────────────────────────

import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";

// ── Use cases ───────────────────────────────────────────────

import { SignUp } from "@/usecases/SignUp";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";

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

  // External services
  paymentGateway: IPaymentGateway;

  // Use cases
  signUp: SignUp;
  createPaymentIntent: CreatePaymentIntent;
  checkCourseAccess: CheckCourseAccess;
}

// ── Production container ─────────────────────────────────────

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();

  const userRepo: UserRepository = new PrismaUserRepository(prisma);
  const courseRepo: CourseRepository = new InMemoryCourseRepository();
  const orderRepo: IOrderRepository = new InMemoryOrderRepository();

  const paymentGateway: IPaymentGateway = new PayMongoAdapter(
    process.env.PAYMONGO_SECRET ?? "",
    process.env.PAYMONGO_WEBHOOK_SECRET,
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const accessPolicy: IAccessPolicy = new TierAccessPolicy(userRepo, courseRepo);

  return {
    clock,
    idGen,
    userRepo,
    courseRepo,
    orderRepo,
    paymentGateway,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl,
    }),
    checkCourseAccess: new CheckCourseAccess(accessPolicy),
  };
}

// ── Test container ──────────────────────────────────────────

export interface TestContainer extends AppContainer {
  userRepo: InMemoryUserRepository;
  courseRepo: InMemoryCourseRepository;
  orderRepo: InMemoryOrderRepository;
  accessPolicy: StubAccessPolicy;
}

export function buildTestContainer(): TestContainer {
  const clock = new FixedClock(new Date());
  const idGen = new InMemoryIdGenerator();
  const userRepo = new InMemoryUserRepository();
  const courseRepo = new InMemoryCourseRepository();
  const orderRepo = new InMemoryOrderRepository();
  const paymentGateway: IPaymentGateway = new StubPaymentGateway();
  const accessPolicy = new StubAccessPolicy();

  return {
    clock,
    idGen,
    userRepo,
    courseRepo,
    orderRepo,
    paymentGateway,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
    createPaymentIntent: new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl: "https://test.amph.example.com",
    }),
    checkCourseAccess: new CheckCourseAccess(accessPolicy),
    accessPolicy,
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

/**
 * Composition root — the single place where all dependencies are wired together.
 *
 * ADR-020: This is the only module in the codebase that knows about all layers.
 * Everything else receives its dependencies via constructor injection.
 *
 * Two containers:
 * - buildContainer() — production: real infra adapters
 * - buildTestContainer() — test: in-memory fakes
 *
 * Request-scoped: each incoming request gets its own container instance
 * via AsyncLocalStorage. Use `getContainer()` inside server actions.
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ── System ports (always singletons) ───────────────────────

import { SystemClock } from "@/ports/system/Clock";
import type { Clock } from "@/ports/system/Clock";

import { UlidGenerator } from "@/infra/system/UlidGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";

// ── Repository ports ────────────────────────────────────────

import type { UserRepository } from "@/ports/repositories/UserRepository";
import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";
import { prisma } from "@/infra/database/prisma";

// ── Use cases ───────────────────────────────────────────────

import { SignUp } from "@/usecases/SignUp";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";

// ── Container shape ─────────────────────────────────────────

export interface AppContainer {
  // System
  clock: Clock;
  idGen: IdGenerator;

  // Repositories
  userRepo: UserRepository;

  // Use cases
  signUp: SignUp;
}

// ── Production container ─────────────────────────────────────

function buildProductionContainer(): AppContainer {
  const clock: Clock = new SystemClock();
  const idGen: IdGenerator = new UlidGenerator();

  // STORY-002: PrismaUserRepository — production adapter for UserRepository port
  const userRepo: UserRepository = new PrismaUserRepository(prisma);

  return {
    clock,
    idGen,
    userRepo,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
  };
}

// ── Test container ──────────────────────────────────────────

import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

export interface TestContainer extends AppContainer {
  userRepo: InMemoryUserRepository;
}

export function buildTestContainer(): TestContainer {
  const clock = new FixedClock(new Date());
  const idGen = new InMemoryIdGenerator();
  const userRepo = new InMemoryUserRepository();

  return {
    clock,
    idGen,
    userRepo,
    signUp: new SignUp(userRepo, idGen, clock, new Argon2PasswordHasher()),
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

/** Build the production container. Call once at module level or cache it. */
let _productionContainer: AppContainer | null = null;

export function buildContainer(): AppContainer {
  if (!_productionContainer) {
    _productionContainer = buildProductionContainer();
  }
  return _productionContainer;
}

/**
 * SignUp use case — Story 003.
 *
 * Orchestrates a new user registration:
 * 1. Validate input
 * 2. Check email uniqueness
 * 3. Hash password
 * 4. Persist user
 * 5. Return result
 *
 * All logic is constructor-injected. No framework imports in this file.
 * Returns Result<T, E> — never throws across the layer boundary.
 */

import { Result } from "@/domain/shared/Result";
import { createEmail } from "@/domain/values/Email";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

// ── Input / Output types ────────────────────────────────────

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type SignUpError =
  | { kind: "email_taken" }
  | { kind: "weak_password"; score: number }
  | { kind: "invalid_name"; field: "firstName" | "lastName" }
  | { kind: "invalid_email" }
  | { kind: "db_error"; message: string }
  | { kind: "hash_error"; message: string };

export type SignUpOutput =
  { ok: true; userId: string; email: string } | { ok: false; error: SignUpError };

// ── Password strength ────────────────────────────────────────

/** 0–4 scale. Minimum 3 to pass. */
function assessPassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

// ── Use case ────────────────────────────────────────────────

export class SignUp {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
    private readonly hasher: PasswordHasher,
    private readonly recordAuditLog: RecordAuditLog,
  ) {}

  async execute(input: SignUpInput): Promise<SignUpOutput> {
    // 1. Validate names
    if (!input.firstName.trim()) {
      return { ok: false, error: { kind: "invalid_name", field: "firstName" } };
    }
    if (!input.lastName.trim()) {
      return { ok: false, error: { kind: "invalid_name", field: "lastName" } };
    }

    // 2. Validate email format
    const emailResult = createEmail(input.email);
    if (Result.isErr(emailResult)) {
      return { ok: false, error: { kind: "invalid_email" } };
    }
    const email = emailResult.value;

    // 3. Validate password strength
    const score = assessPassword(input.password);
    if (score < 3) {
      return { ok: false, error: { kind: "weak_password", score } };
    }

    // 4. Check email uniqueness
    const emailExists = await this.userRepo.emailExists(email);
    if (Result.isErr(emailExists)) {
      return { ok: false, error: { kind: "db_error", message: "email check failed" } };
    }
    if (emailExists.value) {
      return { ok: false, error: { kind: "email_taken" } };
    }

    // 5. Hash password (delegated to infra — this interface will be added in STORY-011)
    const hashResult = await this.hashPassword(input.password);
    if (Result.isErr(hashResult)) {
      return { ok: false, error: hashResult.error };
    }
    const passwordHash = hashResult.value;

    // 6. Persist user
    const id = this.idGen.newId();
    const createResult = await this.userRepo.create({
      id,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    if (Result.isErr(createResult)) {
      if (createResult.error.kind === "email_taken") {
        return { ok: false, error: { kind: "email_taken" } };
      }
      return {
        ok: false,
        error: { kind: "db_error", message: "create user failed" },
      };
    }

    // 7. Log audit event — best-effort. RecordAuditLog swallows errors,
    // so a failed audit write never rolls back the signup.
    await this.recordAuditLog.execute({
      actorId: createResult.value.id,
      action: "user.signed_up",
      targetType: "user",
      targetId: createResult.value.id,
      metadata: {
        email: createResult.value.email,
        timestamp: this.clock.now().toISOString(),
      },
    });

    return {
      ok: true,
      userId: id,
      email: createResult.value.email,
    };
  }

  private async hashPassword(
    password: string,
  ): Promise<Result<string, { kind: "hash_error"; message: string }>> {
    const result = await this.hasher.hash(password);
    if (Result.isErr(result)) {
      return Result.err({ kind: "hash_error", message: "Password hashing failed" });
    }
    return Result.ok(result.value);
  }
}

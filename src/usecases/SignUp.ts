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

import { Result } from "@/lib/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

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
  | { kind: "db_error"; message: string };

export type SignUpOutput =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: SignUpError };

// ── Password strength ────────────────────────────────────────

/** 0–4 scale. Minimum 3 to pass. */
function assessPassword(password: string): number {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password))  score++;
  if (/[0-9]/.test(password))  score++;
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
    if (!this.isValidEmail(input.email)) {
      return { ok: false, error: { kind: "invalid_email" } };
    }

    // 3. Validate password strength
    const score = assessPassword(input.password);
    if (score < 3) {
      return { ok: false, error: { kind: "weak_password", score } };
    }

    // 4. Check email uniqueness
    const emailExists = await this.userRepo.emailExists(input.email);
    if (Result.isErr(emailExists)) {
      return { ok: false, error: { kind: "db_error", message: "email check failed" } };
    }
    if (emailExists.value) {
      return { ok: false, error: { kind: "email_taken" } };
    }

    // 5. Hash password (delegated to infra — this interface will be added in STORY-011)
    const passwordHash = await this.hashPassword(input.password);

    // 6. Persist user
    const id = this.idGen.newId();
    const createResult = await this.userRepo.create({
      id,
      email: input.email,
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

    // 7. Log audit event (fire-and-forget; does not block the result)
    this.logAudit("user.signed_up", createResult.value.id, {
      email: createResult.value.email,
      timestamp: this.clock.now().toISOString(),
    });

    return {
      ok: true,
      userId: id,
      email: createResult.value.email,
    };
  }

  private isValidEmail(email: string): boolean {
    return email.includes("@") && email.includes(".") && email.length <= 254;
  }

  private async hashPassword(password: string): Promise<string> {
    const result = await this.hasher.hash(password);
    if (Result.isErr(result)) {
      throw new Error("Password hashing failed — this should not happen in production");
    }
    return result.value;
  }

  private logAudit(action: string, userId: string | undefined, payload: Record<string, unknown>): void {
    // TODO (STORY-009): Inject AuditLogRepository and write the audit entry.
    // Fire-and-forget — audit failures must not roll back the use case.
    if (process.env.NODE_ENV === "development") {
      console.debug("[Audit]", action, { userId, ...payload });
    }
  }
}

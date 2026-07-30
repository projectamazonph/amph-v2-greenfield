/**
 * AdminGrantSubscription — admin manually grants a student a
 * subscription tier (STARTER/PRO) outside the checkout flow.
 *
 * For students who paid outside the platform (bank transfer, GCash
 * sent directly, cash) rather than through PayMongo. Finds the
 * student by email, creating a placeholder account if none exists,
 * sets `subscriptionTier` directly, and optionally records how the
 * student paid for bookkeeping (method, amount, free-text reference)
 * as AuditLog metadata — no Order row is created, since Order is
 * scoped to a single course purchase and this grant is tier-wide.
 *
 * New accounts get no usable password (a random hash they can never
 * enter) — reuses RequestPasswordReset to mint a "set your password"
 * email, exactly like the public forgot-password flow, so the
 * account isn't left unreachable.
 */

import { randomUUID } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import type { SubscriptionTier } from "@/domain/entities/User";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminGrantSubscriptionPaymentInput {
  /** Free-text payment method, e.g. "GCash", "Bank transfer", "Cash". */
  method: string;
  /** Amount actually received, in minor units (centavos). */
  amountMinor: number;
  /** Free-text reference for bookkeeping, e.g. a GCash ref # or receipt note. */
  reference?: string;
}

export interface AdminGrantSubscriptionInput {
  email: string;
  /** Required only when the student has no account yet. */
  firstName?: string;
  /** Required only when the student has no account yet. */
  lastName?: string;
  subscriptionTier: SubscriptionTier;
  actorId: string;
  /** Omit for comp/free grants — no payment is recorded. */
  payment?: AdminGrantSubscriptionPaymentInput;
}

export type AdminGrantSubscriptionError =
  | { kind: "invalid_email" }
  | { kind: "invalid_name"; field: "firstName" | "lastName" }
  | { kind: "db_error"; message: string };

export interface AdminGrantSubscriptionOutput {
  userId: string;
  isNewUser: boolean;
  subscriptionTier: SubscriptionTier;
}

export type AdminGrantSubscriptionResult = Result<
  AdminGrantSubscriptionOutput,
  AdminGrantSubscriptionError
>;

export interface AdminGrantSubscriptionDeps {
  userRepo: UserRepository;
  idGen: IdGenerator;
  passwordHasher: PasswordHasher;
  recordAuditLog: RecordAuditLog;
  /** Reused (not duplicated) to send new accounts a "set your password" email. */
  requestPasswordReset: RequestPasswordReset;
}

export class AdminGrantSubscription {
  constructor(private readonly deps: AdminGrantSubscriptionDeps) {}

  async execute(input: AdminGrantSubscriptionInput): Promise<AdminGrantSubscriptionResult> {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return Result.err({ kind: "invalid_email" });
    }

    const existingResult = await this.deps.userRepo.findByEmail(email);

    let userId: string;
    let isNewUser: boolean;

    if (existingResult.ok) {
      userId = existingResult.value.id;
      isNewUser = false;
    } else {
      const firstName = input.firstName?.trim();
      if (!firstName) {
        return Result.err({ kind: "invalid_name", field: "firstName" });
      }
      const lastName = input.lastName?.trim();
      if (!lastName) {
        return Result.err({ kind: "invalid_name", field: "lastName" });
      }

      const hashResult = await this.deps.passwordHasher.hash(randomUUID());
      if (!hashResult.ok) {
        return Result.err({ kind: "db_error", message: "Failed to provision account." });
      }

      const createResult = await this.deps.userRepo.create({
        id: this.deps.idGen.newId(),
        email,
        passwordHash: hashResult.value,
        firstName,
        lastName,
      });

      if (createResult.ok) {
        userId = createResult.value.id;
        isNewUser = true;
      } else if (createResult.error.kind === "email_taken") {
        // Race: another request created this user between findByEmail and
        // create() above. Treat it like the "existing user" path.
        const raceResult = await this.deps.userRepo.findByEmail(email);
        if (!raceResult.ok) {
          return Result.err({ kind: "db_error", message: "email_taken but lookup failed" });
        }
        userId = raceResult.value.id;
        isNewUser = false;
      } else {
        const message =
          createResult.error.kind === "db_error"
            ? createResult.error.message
            : createResult.error.kind;
        return Result.err({ kind: "db_error", message });
      }
    }

    const updateResult = await this.deps.userRepo.update(userId, {
      subscriptionTier: input.subscriptionTier,
    });
    if (!updateResult.ok) {
      const message =
        updateResult.error.kind === "db_error"
          ? updateResult.error.message
          : updateResult.error.kind;
      return Result.err({ kind: "db_error", message });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "user.subscription_granted",
      targetType: "user",
      targetId: userId,
      metadata: {
        subscriptionTier: input.subscriptionTier,
        isNewUser,
        ...(input.payment
          ? {
              paymentMethod: input.payment.method,
              paymentAmountMinor: input.payment.amountMinor,
              paymentReference: input.payment.reference,
            }
          : {}),
      },
    });

    if (isNewUser) {
      // Best-effort: the grant itself already succeeded and was audited
      // above. A failure to send the claim email shouldn't undo the
      // grant — the admin can trigger "forgot password" for the student
      // manually if this silently fails.
      await this.deps.requestPasswordReset.execute({ email, ip: "admin-grant" });
    }

    return Result.ok({ userId, isNewUser, subscriptionTier: input.subscriptionTier });
  }
}

/**
 * InMemoryUserRepository — a fast, synchronous fake for unit tests.
 *
 * Uses a plain Map so test runs are instant. Reset between tests
 * by calling `.clear()`.
 *
 * @example
 * ```ts
 * const repo = new InMemoryUserRepository();
 * const r = await repo.create({ id: "1", email: "a@b.com", passwordHash: "x", firstName: "Alice", lastName: "V" });
 * expect(Result.isOk(r)).toBe(true);
 * const found = await repo.findByEmail("a@b.com");
 * expect(found.value.email).toBe("a@b.com");
 * ```
 */

import type { User } from "@/domain/entities/User";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { Result } from "@/domain/shared/Result";
import type { UserError } from "@/ports/repositories/UserRepository";

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  private emailIndex = new Map<string, string>(); // email → id
  private passwordHashes = new Map<string, string>(); // userId → hash

  async findById(id: string): Promise<Result<User, UserError>> {
    const user = this.users.get(id);
    if (!user) return Result.err({ kind: "not_found" });
    return Result.ok(user);
  }

  async findByEmail(email: string): Promise<Result<User, UserError>> {
    const id = this.emailIndex.get(email.toLowerCase());
    if (!id) return Result.err({ kind: "not_found" });
    const user = this.users.get(id);
    if (!user) return Result.err({ kind: "not_found" }); // belt-and-suspenders
    return Result.ok(user);
  }

  async create(params: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<Result<User, UserError>> {
    const normalizedEmail = params.email.toLowerCase();

    // Check email uniqueness
    if (this.emailIndex.has(normalizedEmail)) {
      return Result.err({ kind: "email_taken" });
    }

    const createResult = {
      id: params.id,
      email: normalizedEmail,
      firstName: params.firstName,
      lastName: params.lastName,
      role: "STUDENT" as const,
      subscriptionTier: "FREE" as const,
      verificationStatus: "UNVERIFIED" as const,
      enrolledCourseIds: Object.freeze([]),
      createdAt: new Date(),
    };

    // Use createUser entity (if available) or direct freeze
    const user = Object.freeze(createResult);

    this.users.set(params.id, user);
    this.emailIndex.set(normalizedEmail, params.id);
    this.passwordHashes.set(params.id, params.passwordHash);

    return Result.ok(user);
  }

  async update(
    id: string,
    patch: Partial<{ firstName: string; lastName: string; avatarUrl: string; bio: string }>,
  ): Promise<Result<User, UserError>> {
    const user = this.users.get(id);
    if (!user) return Result.err({ kind: "not_found" });

    const updated = Object.freeze({ ...user, ...patch });
    this.users.set(id, updated);
    return Result.ok(updated);
  }

  async emailExists(email: string): Promise<Result<boolean, UserError>> {
    return Result.ok(this.emailIndex.has(email.toLowerCase()));
  }

  /** Get the stored password hash for a user. */
  async getPasswordHash(id: string): Promise<Result<string, UserError>> {
    const hash = this.passwordHashes.get(id);
    if (!hash) return Result.err({ kind: "not_found" });
    return Result.ok(hash);
  }

  /** Remove all users. Call between tests. */
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
    this.passwordHashes.clear();
  }

  /** Pre-load with a set of users (for integration test fixtures). */
  seed(users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }>): void {
    users.forEach((u) => {
      this.create(u); // sync in memory
    });
  }

  /**
   * Add a course ID to a user's enrolledCourseIds.
   * Used in tests to simulate enrollment.
   */
  addEnrollment(userId: string, courseId: string): void {
    const user = this.users.get(userId);
    if (!user) return;
    const updated = Object.freeze({
      ...user,
      enrolledCourseIds: Object.freeze([...user.enrolledCourseIds, courseId]),
    });
    this.users.set(userId, updated);
  }

  /** Number of users stored. Use in tests. */
  count(): number {
    return this.users.size;
  }
}

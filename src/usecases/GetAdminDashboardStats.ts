/**
 * GetAdminDashboardStats — STORY-046.
 *
 * Use case that computes the 6 stat tiles for the admin dashboard.
 *
 * SOLI D principles applied:
 * - Single Responsibility: only computes dashboard stats, nothing else.
 * - Open/Closed: the stat set is the contract; adding a stat means
 *   adding a field to AdminDashboardStats and a row to the executor.
 *   No existing field is touched.
 * - Liskov / Interface Segregation: depends on five narrow repository
 *   ports, each with the methods this use case actually needs.
 * - Dependency Inversion: depends on the port abstractions
 *   (UserRepository, etc.) — not on Prisma, the InMemory repos, or
 *   any framework.
 *
 * Stats:
 * - totalStudents: count of users with role === 'STUDENT'
 * - totalCourses: count of all courses (CourseRepository.listAll)
 * - activeEnrollments: count of all enrollments (via per-user findByUserId)
 * - totalRevenuePhp: sum of paid order amounts in PHP (centavos / 100)
 * - certificatesIssued: count of non-revoked certificates
 * - pendingRefunds: 0 (RefundRequestRepository not yet implemented; future story)
 *
 * Performance: this is a small-N implementation. It iterates all users
 * to compute per-user aggregates. For an admin app with < 100k records
 * this is fine. At scale, add `count()` methods to the repos and use
 * them — see the `// SCALE:` comments in the executor.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IOrderRepository as OrderRepository } from "@/ports/repositories/OrderRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";

export interface AdminDashboardStats {
  totalStudents: number;
  totalCourses: number;
  activeEnrollments: number;
  totalRevenuePhp: number;
  certificatesIssued: number;
  pendingRefunds: number;
}

export type GetAdminDashboardStatsError = {
  kind: "db_error";
  message: string;
};

export class GetAdminDashboardStats {
  constructor(private readonly deps: {
    userRepo: UserRepository;
    courseRepo: CourseRepository;
    orderRepo: OrderRepository;
    enrollmentRepo: IEnrollmentRepository;
    certificateRepo: ICertificateRepository;
  }) {}

  async execute(): Promise<
    Result<AdminDashboardStats, GetAdminDashboardStatsError>
  > {
    // ── totalStudents ────────────────────────────────────────────
    // SCALE: replace with userRepo.count({ role: 'STUDENT' })
    const usersResult = await this.deps.userRepo.listAll();
    if (!usersResult.ok) {
      return Result.err({
        kind: "db_error",
        message: `userRepo.listAll failed: ${usersResult.error.kind}`,
      });
    }
    const totalStudents = usersResult.value.filter(
      (u) => u.role === "STUDENT",
    ).length;
    const allUsers = usersResult.value;

    // ── totalCourses ─────────────────────────────────────────────
    // SCALE: replace with courseRepo.count()
    const coursesResult = await this.deps.courseRepo.listAll();
    if (!coursesResult.ok) {
      return Result.err({
        kind: "db_error",
        message: `courseRepo.listAll failed: ${coursesResult.error.kind}`,
      });
    }
    const totalCourses = coursesResult.value.length;

    // ── activeEnrollments ────────────────────────────────────────
    // SCALE: replace with enrollmentRepo.count()
    let activeEnrollments = 0;
    for (const user of allUsers) {
      const r = await this.deps.enrollmentRepo.findByUserId(user.id);
      if (r.ok) activeEnrollments += r.value.length;
    }

    // ── totalRevenuePhp ──────────────────────────────────────────
    // SCALE: replace with orderRepo.sumPaid() (SQL SUM on paid orders)
    let totalRevenuePhp = 0;
    for (const user of allUsers) {
      const r = await this.deps.orderRepo.findByUserId(user.id);
      if (!r.ok) continue;
      for (const order of r.value) {
        if (order.isPaid()) {
          totalRevenuePhp += order.totalMinor / 100;
        }
      }
    }

    // ── certificatesIssued ───────────────────────────────────────
    // SCALE: replace with certificateRepo.count({ revoked: false })
    let certificatesIssued = 0;
    for (const user of allUsers) {
      const r = await this.deps.certificateRepo.findByUserId(user.id);
      if (!r.ok) continue;
      for (const c of r.value) {
        if (!c.revokedAt) certificatesIssued += 1;
      }
    }

    return Result.ok({
      totalStudents,
      totalCourses,
      activeEnrollments,
      totalRevenuePhp,
      certificatesIssued,
      pendingRefunds: 0, // RefundRequestRepository not yet implemented
    });
  }
}

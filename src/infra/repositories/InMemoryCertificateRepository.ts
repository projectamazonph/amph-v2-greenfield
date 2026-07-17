/**
 * InMemoryCertificateRepository — fast in-memory fake for tests.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 */

import { Result } from "@/domain/shared/Result";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { Certificate } from "@/domain/entities/Certificate";

export class InMemoryCertificateRepository implements ICertificateRepository {
  private certs = new Map<string, Certificate>(); // key = cert.id

  async create(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>> {
    // Enforce UNIQUE (userId, courseId) — mirrors DB constraint
    const duplicate = [...this.certs.values()].find(
      (c) => c.userId === cert.userId && c.courseId === cert.courseId,
    );
    if (duplicate) {
      return Result.err({ kind: "db_error", message: "Certificate already exists for this user/course" });
    }
    this.certs.set(cert.id, cert);
    return Result.ok(cert);
  }

  async findById(id: string): Promise<Result<Certificate | null, CertificateRepositoryError>> {
    return Result.ok(this.certs.get(id) ?? null);
  }

  async findByVerificationHash(
    hash: string,
  ): Promise<Result<Certificate | null, CertificateRepositoryError>> {
    const found = [...this.certs.values()].find((c) => c.verificationHash === hash);
    return Result.ok(found ?? null);
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<readonly Certificate[], CertificateRepositoryError>> {
    const found = [...this.certs.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime()); // newest first
    return Result.ok(found);
  }

  async update(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>> {
    if (!this.certs.has(cert.id)) {
      return Result.err({ kind: "not_found" });
    }
    this.certs.set(cert.id, cert);
    return Result.ok(cert);
  }

  /** Clear all certificates. Call between tests. */
  clear(): void {
    this.certs.clear();
  }
}

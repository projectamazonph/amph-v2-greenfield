/**
 * PrismaCertificateRepository — production adapter for ICertificateRepository.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { Certificate, CertificateStatus } from "@/domain/entities/Certificate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CertificateRow = any;

export class PrismaCertificateRepository implements ICertificateRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>> {
    try {
      const row = await this.db.certificate.create({
        data: {
          id: cert.id,
          userId: cert.userId,
          courseId: cert.courseId,
          verificationHash: cert.verificationHash,
          issuedAt: cert.issuedAt,
          revokedAt: cert.revokedAt,
          revokedReason: cert.revokedReason,
          status: cert.status,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      const msg = String(err);
      // P2002 = unique constraint violation (userId+courseId or verificationHash collision)
      if (msg.includes("P2002") || msg.includes("unique")) {
        return Result.err({ kind: "db_error", message: "Certificate already exists" });
      }
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async findById(id: string): Promise<Result<Certificate | null, CertificateRepositoryError>> {
    try {
      const row = await this.db.certificate.findUnique({ where: { id } });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByVerificationHash(
    hash: string,
  ): Promise<Result<Certificate | null, CertificateRepositoryError>> {
    try {
      const row = await this.db.certificate.findUnique({ where: { verificationHash: hash } });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<readonly Certificate[], CertificateRepositoryError>> {
    try {
      const rows: CertificateRow[] = await this.db.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>> {
    try {
      const row = await this.db.certificate.update({
        where: { id: cert.id },
        data: {
          revokedAt: cert.revokedAt,
          revokedReason: cert.revokedReason,
          status: cert.status,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      const msg = String(err);
      // P2025 = record not found
      if (msg.includes("P2025") || msg.includes("Record to update not found")) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  private mapRow(row: CertificateRow): Certificate {
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      verificationHash: row.verificationHash,
      issuedAt: row.issuedAt,
      revokedAt: row.revokedAt,
      revokedReason: row.revokedReason,
      status: row.status as CertificateStatus,
    };
  }
}

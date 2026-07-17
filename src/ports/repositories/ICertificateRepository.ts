/**
 * ICertificateRepository — port for persisting and querying certificates.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";

/** Errors that can arise when reading or writing certificates. */
export type CertificateRepositoryError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface ICertificateRepository {
  /**
   * Persist a new certificate.
   * The repository must enforce a UNIQUE constraint on (userId, courseId).
   */
  create(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>>;

  /**
   * Find a certificate by its primary key.
   * Returns null if no certificate exists with that id.
   */
  findById(id: string): Promise<Result<Certificate | null, CertificateRepositoryError>>;

  /**
   * Find a certificate by its public verification hash.
   * Used by the public `/certificates/[hash]` view (STORY-043).
   * Returns null if no certificate matches the hash.
   */
  findByVerificationHash(
    hash: string,
  ): Promise<Result<Certificate | null, CertificateRepositoryError>>;

  /**
   * Find all certificates for a user, newest first.
   */
  findByUserId(
    userId: string,
  ): Promise<Result<readonly Certificate[], CertificateRepositoryError>>;

  /**
   * Persist changes to an existing certificate.
   * Used by RevokeCertificate (STORY-044).
   */
  update(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>>;
}

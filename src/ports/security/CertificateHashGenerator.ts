/**
 * CertificateHashGenerator port — deterministic fingerprint of a certificate.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * Produces a stable, public fingerprint of a certificate's issuance event
 * (id + userId + courseId + issuedAt). Same inputs always produce the same
 * output. The hash is NOT a secret — it lives in the public URL
 * `/certificates/{hash}` and on the PDF's QR code (STORY-042, STORY-043).
 *
 * The use-case layer must not call `node:crypto` directly. Inject this
 * port instead so the algorithm is swappable and the domain is pure.
 *
 * ADR-014: Port returns a plain string — this is a pure function, not an
 * operation that can fail. If the algorithm ever changes to something
 * fallible, this contract should be revisited.
 */

export interface CertificateHashInput {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly issuedAt: Date;
}

export interface CertificateHashGenerator {
  /**
   * Produce a 64-char lowercase hex string (sha256-style output).
   * Pure — deterministic for the same input.
   */
  hash(input: CertificateHashInput): string;
}

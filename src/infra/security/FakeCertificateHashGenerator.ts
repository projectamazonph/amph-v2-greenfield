/**
 * FakeCertificateHashGenerator — deterministic test fake.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * Produces a 64-char hex string by formatting `input.id` repeatedly.
 * Deterministic (same input = same output) so the public view test
 * (STORY-043) can re-derive hashes for fixtures. NOT a real sha256 — the
 * leading 4 chars are always "dead" so test assertions can spot a leaked
 * real hasher.
 */

import type {
  CertificateHashGenerator,
  CertificateHashInput,
} from "@/ports/security/CertificateHashGenerator";

export class FakeCertificateHashGenerator implements CertificateHashGenerator {
  hash(input: CertificateHashInput): string {
    // 4-char sentinel + 60 chars of repeated id hash. Filler is the
    // concatenation of id|userId|courseId hex-encoded, padded/truncated
    // to exactly 60 chars.
    const filler = Buffer.from(
      `${input.id}|${input.userId}|${input.courseId}|${input.issuedAt.toISOString()}`,
      "utf8",
    )
      .toString("hex")
      .padEnd(60, "0")
      .slice(0, 60);

    return `dead${filler}`;
  }
}

/**
 * NodeCertificateHashGenerator — sha256 adapter for CertificateHashGenerator.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * Uses node:crypto to produce a deterministic, 64-char lowercase hex string
 * from (id, userId, courseId, issuedAt.iso). Same inputs always produce
 * the same output. Pure function — no I/O, no time-dependence beyond the
 * supplied `issuedAt`.
 *
 * The hash format is intentionally URL-safe: lowercase hex, no padding,
 * no separators. It goes straight into `/certificates/{hash}` paths.
 */

import { createHash } from "node:crypto";
import type {
  CertificateHashGenerator,
  CertificateHashInput,
} from "@/ports/security/CertificateHashGenerator";

export class NodeCertificateHashGenerator implements CertificateHashGenerator {
  hash(input: CertificateHashInput): string {
    // Concatenate with a separator that cannot appear in any field.
    // (cuid/ULID chars are alphanumeric; userId/courseId are cuid too.)
    const payload = [
      input.id,
      input.userId,
      input.courseId,
      input.issuedAt.toISOString(),
    ].join("|");

    return createHash("sha256").update(payload, "utf8").digest("hex");
  }
}

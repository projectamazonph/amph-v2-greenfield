/**
 * Certificate entity tests — TDD (red first).
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 */

import { describe, it, expect } from "vitest";
import {
  createCertificate,
  revokeCertificate,
} from "@/domain/entities/Certificate";

const VALID_HASH = "a".repeat(64); // any 64-char hex string is structurally valid
const USER_ID = "user_01";
const COURSE_ID = "course_01";
const ID = "cert_01";
const ISSUED_AT = new Date("2025-07-01T00:00:00Z");
const REVOKED_AT = new Date("2025-08-01T00:00:00Z");
const REVOKE_REASON = "refund_issued";

describe("Certificate", () => {
  describe("createCertificate", () => {
    it("creates a valid certificate with status=active", () => {
      const result = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: VALID_HASH,
        issuedAt: ISSUED_AT,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe(ID);
      expect(result.value.userId).toBe(USER_ID);
      expect(result.value.courseId).toBe(COURSE_ID);
      expect(result.value.verificationHash).toBe(VALID_HASH);
      expect(result.value.issuedAt).toBe(ISSUED_AT);
      expect(result.value.status).toBe("active");
      expect(result.value.revokedAt).toBeNull();
      expect(result.value.revokedReason).toBeNull();
    });

    it("accepts a real 64-char hex hash", () => {
      const realHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const result = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: realHash,
        issuedAt: ISSUED_AT,
      });

      expect(result.ok).toBe(true);
    });

    it("rejects a hash that is not 64 hex chars", () => {
      const result = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: "tooshort",
        issuedAt: ISSUED_AT,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_verification_hash");
    });

    it("rejects a hash that is 64 chars but not all hex", () => {
      const result = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: "z".repeat(64),
        issuedAt: ISSUED_AT,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_verification_hash");
    });

    it("rejects an empty hash", () => {
      const result = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: "",
        issuedAt: ISSUED_AT,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_verification_hash");
    });
  });

  describe("revokeCertificate", () => {
    it("transitions an active certificate to revoked", () => {
      const created = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: VALID_HASH,
        issuedAt: ISSUED_AT,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const revoked = revokeCertificate(created.value, REVOKED_AT, REVOKE_REASON);

      expect(revoked.ok).toBe(true);
      if (!revoked.ok) return;
      expect(revoked.value.status).toBe("revoked");
      expect(revoked.value.revokedAt).toBe(REVOKED_AT);
      expect(revoked.value.revokedReason).toBe(REVOKE_REASON);
    });

    it("rejects revoking a certificate that is already revoked", () => {
      const created = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: VALID_HASH,
        issuedAt: ISSUED_AT,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const firstRevoke = revokeCertificate(created.value, REVOKED_AT, REVOKE_REASON);
      expect(firstRevoke.ok).toBe(true);
      if (!firstRevoke.ok) return;

      const secondRevoke = revokeCertificate(
        firstRevoke.value,
        new Date("2025-09-01T00:00:00Z"),
        "another_reason",
      );

      expect(secondRevoke.ok).toBe(false);
      if (secondRevoke.ok) return;
      expect(secondRevoke.error.kind).toBe("invalid_status_transition");
      if (secondRevoke.error.kind !== "invalid_status_transition") return;
      expect(secondRevoke.error.from).toBe("revoked");
      expect(secondRevoke.error.to).toBe("revoked");
    });

    it("rejects revoking with an empty reason", () => {
      const created = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: VALID_HASH,
        issuedAt: ISSUED_AT,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const revoked = revokeCertificate(created.value, REVOKED_AT, "   ");

      expect(revoked.ok).toBe(false);
      if (revoked.ok) return;
      expect(revoked.error.kind).toBe("db_error");
    });

    it("does not mutate the original certificate on revoke", () => {
      const created = createCertificate({
        id: ID,
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: VALID_HASH,
        issuedAt: ISSUED_AT,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const original = created.value;

      revokeCertificate(original, REVOKED_AT, REVOKE_REASON);

      // Original is unchanged — entities are readonly
      expect(original.status).toBe("active");
      expect(original.revokedAt).toBeNull();
      expect(original.revokedReason).toBeNull();
    });
  });
});

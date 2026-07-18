/**
 * /certificates/[hash] — Public Certificate Verification
 * STORY-043
 *
 * Anyone with the hash can view the certificate. No auth.
 * Shows a REVOKED badge if the cert is revoked (but still shows all
 * the data — the cert still exists as a record, the revocation is
 * metadata).
 *
 * SSR only. No client components needed.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { hash } = await params;
  const container = buildContainer();
  const result = await container.verifyCertificate.execute({ verificationHash: hash });

  if (!result.ok) {
    return {
      title: "Certificate Not Found — AMPH Academy",
      description: "This certificate could not be verified.",
    };
  }

  const { certificate: _cert, user, course } = result.value;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return {
    title: `${fullName} — ${course.title} Certificate | AMPH Academy`,
    description: `Certificate of completion for ${course.title}, awarded to ${fullName}.`,
    robots: { index: true, follow: true },
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { hash } = await params;
  const container = buildContainer();
  const result = await container.verifyCertificate.execute({ verificationHash: hash });

  if (!result.ok) {
    notFound();
  }

  const { certificate, user, course } = result.value;
  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Anonymous";
  const issuedDate = certificate.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const isRevoked = certificate.status === "revoked";
  const truncatedHash = `${certificate.verificationHash.slice(0, 8)}…${certificate.verificationHash.slice(-8)}`;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Status badge */}
        <div className={styles.statusRow}>
          {isRevoked ? (
            <div className={styles.badgeRevoked}>
              <svg
                className={styles.badgeIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className={styles.badgeLabel}>Certificate Revoked</span>
            </div>
          ) : (
            <div className={styles.badgeVerified}>
              <svg
                className={styles.badgeIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className={styles.badgeLabel}>Verified Certificate</span>
            </div>
          )}
        </div>

        {/* Certificate card */}
        <article
          className={`${styles.certCard} ${
            isRevoked ? styles.certCardRevoked : styles.certCardActive
          }`}
        >
          <div className={styles.certBody}>
            <p className={styles.certOrg}>PROJECT AMAZON PH ACADEMY</p>
            <h1 className={styles.certTitle}>Certificate of Completion</h1>
            <p className={styles.certSubtitle}>— awarded for excellence —</p>

            <p className={styles.certLabel}>This is to certify that</p>
            <p className={styles.certName}>{fullName}</p>
            <p className={styles.certLabel}>has successfully completed the course</p>
            <p className={styles.certCourse}>{course.title}</p>
            {course.tagline ? (
              <p className={styles.certTagline}>{course.tagline}</p>
            ) : (
              <div className={styles.certTaglineSpacer} />
            )}

            {isRevoked && certificate.revokedReason ? (
              <div className={styles.certFooter}>
                <p className={styles.certFooterLabel}>Revocation reason</p>
                <p className={styles.certRevokedReason}>
                  {certificate.revokedReason}
                </p>
                {certificate.revokedAt ? (
                  <p className={styles.certRevokedDate}>
                    Revoked on{" "}
                    {certificate.revokedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className={styles.certIssued}>Issued on {issuedDate}</p>
            )}
          </div>
        </article>

        {/* Actions */}
        <div className={styles.actions}>
          {!isRevoked ? (
            <Link href={`/certificates/${certificate.verificationHash}/pdf`}>
              <Button variant="primary" size="lg">
                <svg
                  className={styles.actionIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF
              </Button>
            </Link>
          ) : null}
          <Link href="/courses">
            <Button variant="secondary" size="lg">
              Browse Courses
            </Button>
          </Link>
        </div>

        {/* Verification footer */}
        <p className={styles.hashLine}>Verification hash: {truncatedHash}</p>
        <p className={styles.hashNote}>
          Anyone with this URL can verify this certificate. The hash is a stable fingerprint of
          the issuance event.
        </p>
      </div>
    </main>
  );
}

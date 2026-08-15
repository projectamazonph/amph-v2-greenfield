/**
 * /certificates/[hash] — Public Certificate Verification
 * STORY-043
 *
 * Anyone with the hash can view the certificate. No auth.
 * Shows a REVOKED badge if the cert is revoked (but still shows all
 * the data — the cert still exists as a record, the revocation is
 * metadata).
 *
 * Mostly SSR — the one interactive bit (the "Download Certificate"
 * print button) is a small Client Component (PrintButton), since a
 * Server Component can't attach a DOM onClick handler directly.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import { StudentShell } from "@/components/student/StudentShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import buttonStyles from "@/components/ui/Button.module.css";
import { PrintButton } from "@/components/ui/PrintButton";
import { Warning, ShieldCheck, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
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
      title: "Certificate Not Found | Project Amazon PH Academy",
      description: "This certificate could not be verified.",
    };
  }

  const { certificate: _cert, user, course } = result.value;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return {
    title: `${fullName} | ${course.title} Certificate | Project Amazon PH Academy`,
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
  // Proposal 2: script-src no longer allows 'unsafe-inline' — this
  // inline JSON-LD script needs the per-request nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <StudentShell requireAuth={false}>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalCredential",
            name: `Certificate: ${course.title}`,
            description: `Certificate of completion for ${course.title} issued by AMPH Academy`,
            issuedBy: {
              "@type": "Organization",
              name: "AMPH Academy",
            },
            datePublished: certificate.issuedAt?.toISOString?.() || new Date().toISOString(),
            credentialCategory: "certificate",
          }),
        }}
      />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <div className={styles.container}>
          {/* Status badge */}
          <div className={styles.statusRow}>
            {isRevoked ? (
              <div className={styles.badgeRevoked}>
                <Warning size={20} weight="fill" className={styles.badgeIcon} aria-hidden />
                <span className={styles.badgeLabel}>Certificate Revoked</span>
              </div>
            ) : (
              <div className={styles.badgeVerified}>
                <ShieldCheck size={20} weight="fill" className={styles.badgeIcon} aria-hidden />
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
              <p className={styles.certSubtitle}>Awarded for excellence</p>

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
                  <p className={styles.certRevokedReason}>{certificate.revokedReason}</p>
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
              <Link
                href={`/certificates/${certificate.verificationHash}/pdf`}
                className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.lg].join(" ")}
              >
                <svg
                  className={styles.actionIcon}
                  aria-hidden="true"
                >
                  <DownloadSimple size={20} weight="regular" />
                </svg>
                Download PDF
              </Link>
            ) : null}
            <Link
              href="/courses"
              className={[buttonStyles.btn, buttonStyles.secondary, buttonStyles.lg].join(" ")}
            >
              Browse Courses
            </Link>
            <PrintButton className={buttonStyles.ghost} style={{ marginTop: "var(--space-4)" }}>
              Download Certificate
            </PrintButton>
          </div>

          {/* Verification footer */}
          <p className={styles.hashLine}>Verification hash: {truncatedHash}</p>
          <p className={styles.hashNote}>
            Anyone with this URL can verify this certificate. The hash is a stable fingerprint of
            the issuance event.
          </p>
        </div>
      </main>
    </StudentShell>
  );
}

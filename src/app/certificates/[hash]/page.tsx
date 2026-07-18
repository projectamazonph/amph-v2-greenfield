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
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";

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

  const { certificate, user, course } = result.value;
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
    <main className="min-h-screen bg-[var(--surface-0)] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Status badge */}
        <div className="flex justify-center mb-6">
          {isRevoked ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--danger-soft)] border-2 border-[var(--danger)]">
              <svg
                className="w-5 h-5 text-[var(--danger)]"
                fill="none"
                viewBox="0 0 24 24"
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
              <span className="text-sm font-semibold text-[var(--danger)] uppercase tracking-wide">
                Certificate Revoked
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F4EA] border-2 border-[var(--success)]">
              <svg
                className="w-5 h-5 text-[var(--success)]"
                fill="none"
                viewBox="0 0 24 24"
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
              <span className="text-sm font-semibold text-[var(--success)] uppercase tracking-wide">
                Verified Certificate
              </span>
            </div>
          )}
        </div>

        {/* Certificate card */}
        <article
          className={`bg-white border-4 rounded-lg shadow-lg overflow-hidden ${
            isRevoked ? "border-[var(--danger)] opacity-90" : "border-[#1a365d]"
          }`}
        >
          <div className="p-10 sm:p-14 text-center">
            <p className="text-xs font-bold text-[#1a365d] tracking-[0.2em] mb-2">
              PROJECT AMAZON PH ACADEMY
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1a365d] mb-2">
              Certificate of Completion
            </h1>
            <p className="text-sm text-[var(--ink-500)] italic mb-10">
              — awarded for excellence —
            </p>

            <p className="text-sm text-[var(--ink-700)] mb-3">This is to certify that</p>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)] mb-6">
              {fullName}
            </p>
            <p className="text-sm text-[var(--ink-700)] mb-3">has successfully completed the course</p>
            <p className="text-xl sm:text-2xl font-bold text-[#1a365d] mb-2">{course.title}</p>
            {course.tagline ? (
              <p className="text-sm text-[var(--ink-500)] italic mb-8">{course.tagline}</p>
            ) : (
              <div className="mb-8" />
            )}

            {isRevoked && certificate.revokedReason ? (
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <p className="text-xs uppercase tracking-wide text-[var(--ink-500)] mb-1">
                  Revocation reason
                </p>
                <p className="text-sm text-[var(--danger)] font-medium">
                  {certificate.revokedReason}
                </p>
                {certificate.revokedAt ? (
                  <p className="text-xs text-[var(--ink-500)] mt-1">
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
              <p className="text-sm text-[var(--ink-500)] mt-6 pt-6 border-t border-[var(--border)]">
                Issued on {issuedDate}
              </p>
            )}
          </div>
        </article>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {!isRevoked ? (
            <Link
              href={`/certificates/${certificate.verificationHash}/pdf`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
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
            </Link>
          ) : null}
          <Link
            href="/courses"
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-[var(--border)] text-[var(--ink-700)] font-semibold rounded-lg hover:bg-[var(--surface-1)] transition-colors"
          >
            Browse Courses
          </Link>
        </div>

        {/* Verification footer */}
        <p className="mt-8 text-center text-xs text-[var(--ink-500)] font-mono break-all">
          Verification hash: {truncatedHash}
        </p>
        <p className="mt-2 text-center text-xs text-[var(--ink-500)]">
          Anyone with this URL can verify this certificate. The hash is a stable fingerprint of
          the issuance event.
        </p>
      </div>
    </main>
  );
}

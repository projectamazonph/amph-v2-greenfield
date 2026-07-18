/**
 * /certificates/[hash] not-found view
 * STORY-043
 *
 * Shown when the verification hash doesn't match any certificate
 * (or is malformed — Next.js routes here from any notFound() call).
 */

import Link from "next/link";

export default function CertificateNotFound() {
  return (
    <main className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--danger-soft)] mb-6">
          <svg
            className="w-8 h-8 text-[var(--danger)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--ink-900)] mb-3">
          Certificate Not Found
        </h1>
        <p className="text-[var(--ink-500)] mb-8">
          The verification link is invalid, malformed, or the certificate
          has been removed. Double-check the URL or contact the issuer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/courses"
            className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Browse Courses
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-white border border-[var(--border)] text-[var(--ink-700)] font-semibold rounded-lg hover:bg-[var(--surface-1)] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}

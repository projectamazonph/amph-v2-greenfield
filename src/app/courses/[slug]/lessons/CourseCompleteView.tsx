"use client";

/**
 * CourseCompleteView — full-screen celebration when a student completes all lessons.
 *
 * STORY-030: Module progress + next-lesson navigation + course completion view.
 */

interface CourseCompleteViewProps {
  courseTitle: string;
  totalXp: number;
  certificateUrl: string;
}

export function CourseCompleteView({ courseTitle, totalXp, certificateUrl }: CourseCompleteViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 py-16">
      {/* Trophy / celebration icon */}
      <div className="mb-6 rounded-full bg-yellow-100 p-6">
        <TrophyIcon />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-[var(--text)] mb-3">
        Course Complete! 🎉
      </h1>

      {/* Course name */}
      <p className="text-lg text-[var(--text-secondary)] mb-6 max-w-md">
        Congratulations on completing <strong>{courseTitle}</strong>. You&apos;ve mastered all the lessons!
      </p>

      {/* XP earned */}
      <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-semibold text-lg mb-8">
        <StarIcon />
        <span>{totalXp.toLocaleString()} XP earned</span>
      </div>

      {/* Certificate CTA */}
      <a
        href={certificateUrl}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[var(--accent)] text-white font-semibold hover:opacity-90 transition-opacity text-base"
      >
        <CertificateIcon />
        <span>View Certificate</span>
      </a>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────

function TrophyIcon() {
  return (
    <svg className="w-16 h-16 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.79 2 8 3.79 8 6H6c0 2.21 1.79 4 4 4v2H8c0 2.21 1.79 4 4 4s4-1.79 4-4h-2v-2c2.21 0 4-1.79 4-4h-2c0-2.21-1.79-4-4-4V2zm0 6H8V4h4v4zm-6 8h12c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2zm0 4h12v2H8v4h8v-4h2v-2H10c-1.1 0-2-.9-2-2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

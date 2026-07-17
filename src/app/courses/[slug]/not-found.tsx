import Link from "next/link";

export default function CourseNotFound() {
  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text)] mb-3">Course Not Found</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          This course doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/courses"
          className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Browse All Courses
        </Link>
      </div>
    </main>
  );
}

/**
 * /courses/[slug]/lessons/[lessonId] — AMPH Lesson Page
 * Story 026
 *
 * Renders a lesson's content with a sidebar navigation.
 * Access: enrolled users get full access; preview tier gives limited access.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { courseIsAvailable } from "@/domain/entities/Course";
import { getLessonData } from "../getLessonData";
import { LessonContent } from "../LessonContent";
import { LessonSidebar } from "../LessonSidebar";
import { LessonNavButtons } from "../LessonNavButtons";

interface PageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const container = buildContainer();
  const course = await container.courseRepo.findBySlug(slug);

  if (!course.ok || !courseIsAvailable(course.value)) {
    return { title: "Course Not Found — AMPH Academy" };
  }

  const lessonData = getLessonData(course.value, lessonId);
  if (!lessonData) {
    return { title: "Lesson Not Found — AMPH Academy" };
  }

  return {
    title: `${lessonData.lesson.title} — ${course.value.title} | AMPH Academy`,
    description: `${lessonData.sectionTitle}: ${lessonData.lesson.title}`,
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonId } = await params;
  const container = buildContainer();

  // ── Fetch course ────────────────────────────────────────
  const courseResult = await container.courseRepo.findBySlug(slug);
  if (!courseResult.ok || !courseIsAvailable(courseResult.value)) {
    notFound();
  }
  const course = courseResult.value;

  // ── Find lesson ─────────────────────────────────────────
  const lessonData = getLessonData(course, lessonId);
  if (!lessonData) {
    notFound();
  }
  const { lesson, sectionTitle } = lessonData;

  // ── Access check + enrollment data ──────────────────────
  const userId = await getCurrentUserId();
  const completedLessonIds: string[] = [];

  if (userId) {
    // Check course access
    const accessResult = await container.checkCourseAccess.execute({
      userId,
      courseId: course.id,
    });

    if (Result.isErr(accessResult) || accessResult.value.kind === "denied_not_authenticated" ||
        accessResult.value.kind === "denied_not_enrolled" ||
        accessResult.value.kind === "denied_tier") {
      return <AccessDeniedPage courseSlug={slug} courseTitle={course.title} />;
    }

    // Note: completedLessonIds tracking is STORY-027 (MarkLessonComplete)
    // For now, completedLessonIds = [] — no checkmarks until progress is tracked
  } else {
    // Unauthenticated — preview only (first N lessons)
    const previewCount = course.previewLessonCount;
    const allLessonIds = course.curriculum.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const lessonIndex = allLessonIds.indexOf(lessonId);

    if (lessonIndex >= previewCount) {
      return <AccessDeniedPage courseSlug={slug} courseTitle={course.title} />;
    }
    // completedLessonIds = [] — progress tracking is STORY-027
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Sidebar navigation */}
      <LessonSidebar
        course={course}
        currentLessonId={lessonId}
        completedLessonIds={completedLessonIds}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <li>
                <Link href="/courses" className="hover:text-[var(--text)] transition-colors">
                  Courses
                </Link>
              </li>
              <li aria-hidden className="opacity-40">/</li>
              <li>
                <Link
                  href={`/courses/${slug}`}
                  className="hover:text-[var(--text)] transition-colors truncate max-w-[200px]"
                >
                  {course.title}
                </Link>
              </li>
              <li aria-hidden className="opacity-40">/</li>
              <li className="text-[var(--text)] truncate">{lesson.title}</li>
            </ol>
          </nav>

          {/* Lesson header */}
          <div className="mb-8 pb-6 border-b border-[var(--border)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
              {sectionTitle}
            </p>
            <h1 className="text-2xl font-bold text-[var(--text)]">{lesson.title}</h1>
          </div>

          {/* Lesson body */}
          <LessonContent lesson={lesson} />

          {/* Prev / Next navigation */}
          <div className="mt-12 pt-6 border-t border-[var(--border)]">
            <LessonNavButtons
              courseSlug={slug}
              prevLessonId={lessonData.prevLessonId}
              nextLessonId={lessonData.nextLessonId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Access denied page ──────────────────────────────────────

function AccessDeniedPage({
  courseSlug,
  courseTitle,
}: {
  courseSlug: string;
  courseTitle: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="text-center max-w-md px-6">
        <LockIcon />
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">
          Enroll to Access This Lesson
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          This lesson is part of <strong>{courseTitle}</strong>. Enroll to unlock all lessons and
          materials.
        </p>
        <Link
          href={`/courses/${courseSlug}`}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          View Course & Enroll
        </Link>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

/** Get the current authenticated user ID. Returns null if not authenticated. */
async function getCurrentUserId(): Promise<string | null> {
  // TODO (STORY-006): Wire in session/auth. Currently returns null (anonymous).
  return null;
}

// ── Icons ───────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-25"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

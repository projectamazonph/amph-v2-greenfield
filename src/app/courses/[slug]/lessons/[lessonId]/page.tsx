/**
 * /courses/[slug]/lessons/[lessonId] — AMPH Lesson Page
 * Story 026
 *
 * Renders a lesson's content with a sidebar navigation.
 * Access: enrolled users get full access; preview tier gives limited access.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import { courseIsAvailable } from "@/domain/entities/Course";
import { getSessionUserId } from "@/lib/auth";
import { getLessonData } from "../getLessonData";
import { LessonContent } from "../LessonContent";
import { LessonSidebar } from "../LessonSidebar";
import { LessonNavButtons } from "../LessonNavButtons";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

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
  const userId = await getSessionUserId();
  const completedLessonIds: string[] = [];

  if (userId) {
    const accessResult = await container.checkCourseAccess.execute({
      userId,
      courseId: course.id,
    });

    if (
      Result.isErr(accessResult) ||
      accessResult.value.kind === "denied_not_authenticated" ||
      accessResult.value.kind === "denied_not_enrolled" ||
      accessResult.value.kind === "denied_tier"
    ) {
      return <AccessDeniedPage courseSlug={slug} courseTitle={course.title} />;
    }
  } else {
    const previewCount = course.previewLessonCount;
    const allLessonIds = course.curriculum.sections.flatMap((s) =>
      s.lessons.map((l) => l.id),
    );
    const lessonIndex = allLessonIds.indexOf(lessonId);

    if (lessonIndex >= previewCount) {
      return <AccessDeniedPage courseSlug={slug} courseTitle={course.title} />;
    }
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar navigation */}
      <LessonSidebar
        course={course}
        currentLessonId={lessonId}
        completedLessonIds={completedLessonIds}
      />

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/courses" className={styles.breadcrumbLink}>
                  Courses
                </Link>
              </li>
              <li aria-hidden className={styles.breadcrumbSeparator}>/</li>
              <li>
                <Link
                  href={`/courses/${slug}`}
                  className={`${styles.breadcrumbLink} ${styles.breadcrumbTruncate}`}
                >
                  {course.title}
                </Link>
              </li>
              <li aria-hidden className={styles.breadcrumbSeparator}>/</li>
              <li className={styles.breadcrumbCurrent}>{lesson.title}</li>
            </ol>
          </nav>

          {/* Lesson header */}
          <div className={styles.lessonHeader}>
            <p className={styles.sectionLabel}>{sectionTitle}</p>
            <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          </div>

          {/* Lesson body */}
          <LessonContent lesson={lesson} />

          {/* Prev / Next navigation */}
          <div className={styles.navFooter}>
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
    <div className={styles.accessDeniedPage}>
      <div className={styles.accessDeniedCard}>
        <LockIcon />
        <h1 className={styles.accessDeniedTitle}>Enroll to Access This Lesson</h1>
        <p className={styles.accessDeniedText}>
          This lesson is part of <strong>{courseTitle}</strong>. Enroll to unlock all lessons and
          materials.
        </p>
        <Link href={`/courses/${courseSlug}`}>
          <Button variant="primary" size="md">
            View Course & Enroll
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      className={styles.lockIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
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

// Suppress unused-import warning (CheckCourseAccess is part of the
// access-check contract; the executor is wired through the container).
void CheckCourseAccess;

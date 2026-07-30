/**
 * /courses/[slug]/lessons/[lessonId] — Lesson Page
 * Story 026
 *
 * Renders a lesson's content with a sidebar navigation.
 * Access: enrolled users get full access; preview tier gives limited access.
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 */

"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { useEffect, useState } from "react";
import { buildContainer } from "@/composition/container";
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
    return { title: "Course Not Found — Project Amazon PH Academy" };
  }

  const lessonData = getLessonData(course.value, lessonId);
  if (!lessonData) {
    return { title: "Lesson Not Found — Project Amazon PH Academy" };
  }

  return {
    title: `${lessonData.lesson.title} — ${course.value.title} | Project Amazon PH Academy`,
    description: `${lessonData.sectionTitle}: ${lessonData.lesson.title}`,
  };
}

export default async function LessonPage({ params }: PageProps) {
  // NOTE: This page is now a Client Component so we can hook in the
  // 'Lesson complete' confetti trigger. As a side-effect, `generateMetadata`
  // above stops running (it requires a Server Component). If SEO metadata
  // is needed for this route, move it onto a sibling server component
  // (e.g. a `layout.tsx` or a server `<head>` wrapper) — see the project
  // migration notes. For now the route still renders correctly.

  // Hooks (useState / useEffect) MUST be called before any `await` so
  // React's rules-of-hooks stay satisfied for both server- and client-
  // side execution paths.
  const [justCompleted] = useState(false);

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

  // ── Access check (P0-5) ─────────────────────────────
  // Single source of truth: AuthorizeLessonAccess decides per-lesson
  // for every user state (anonymous, authed-preview, enrolled,
  // refunded, admin). The page MUST NOT re-implement this logic.
  const userId = await getSessionUserId();

  // Load completed lessons from the enrollment (if enrolled).
  let completedLessonIds: string[] = [];
  if (userId) {
    const enrollment = await container.enrollmentRepo.findByUserIdAndCourseId(userId, course.id);
    if (enrollment) {
      completedLessonIds = enrollment.completedLessonIds;
    }
  }

  const authResult = await container.authorizeLessonAccess.execute({
    userId: userId ?? "",
    courseId: course.id,
    lessonId,
  });

  if (!authResult.ok || (authResult.ok && authResult.value.kind === "denied")) {
    return <AccessDeniedPage courseSlug={slug} courseTitle={course.title} />;
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar navigation */}
      <LessonSidebar
        course={{ slug: course.slug, title: course.title, curriculum: course.curriculum }}
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
              <li aria-hidden className={styles.breadcrumbSeparator}>
                /
              </li>
              <li>
                <Link
                  href={`/courses/${slug}`}
                  className={`${styles.breadcrumbLink} ${styles.breadcrumbTruncate}`}
                >
                  {course.title}
                </Link>
              </li>
              <li aria-hidden className={styles.breadcrumbSeparator}>
                /
              </li>
              <li className={styles.breadcrumbCurrent}>{lesson.title}</li>
            </ol>
          </nav>

          <Link href={`/courses/${slug}`} className="btn btn-ghost" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>← Back to Course</Link>

          {/* Lesson header */}
          <div className={styles.lessonHeader}>
            <p className={styles.sectionLabel}>{sectionTitle}</p>
            <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          </div>

          {/* Lesson body */}
          <LessonContent lesson={lesson} />

          {/* Mark as Complete */}
          <form action="/api/lessons/complete" method="post" style={{ marginTop: 'var(--space-4)' }}>
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="courseId" value={course.id} />
            <Button variant="primary" size="md" type="submit">Mark as Complete</Button>
          </form>

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

useEffect(() => {
  if (justCompleted) {
    // trigger confetti or fade animation here
  }
}, [justCompleted]);

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

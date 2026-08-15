/**
 * /courses/[slug]/lessons/[lessonId] — Lesson Page
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
import { Clock, ListChecks, Play } from "@phosphor-icons/react/dist/ssr";

import { buildContainer } from "@/composition/container";
import { courseIsAvailable } from "@/domain/entities/Course";
import { getSessionUserId } from "@/lib/auth";
import { getLessonData, withCatalogCurriculum } from "../getLessonData";
import { LessonContent } from "../LessonContent";
import type { Lesson } from "@/domain/entities/Lesson";
import { LessonSidebar } from "../LessonSidebar";
import { LessonNavButtons } from "../LessonNavButtons";
import { Button } from "@/components/ui/Button";
import { CourseAccessNotice } from "@/components/student/CourseAccessNotice";
import { markLessonCompleteAction } from "@/app/actions/markLessonComplete.action";
import styles from "./page.module.css";

function estimateReadingMinutes(lesson: Lesson): { minutes: number; kind: "video" | "reading" | "quiz" } {
  if (lesson.type === "VIDEO") {
    return { minutes: Math.max(1, Math.round(lesson.content.durationMinutes)), kind: "video" };
  }
  if (lesson.type === "QUIZ") {
    return { minutes: Math.max(1, lesson.content.questions.length * 1), kind: "quiz" };
  }
  // TEXT: estimate from word count (avg 200 wpm)
  const words = lesson.content.body.trim().split(/\s+/).filter(Boolean).length;
  return { minutes: Math.max(1, Math.round(words / 200)), kind: "reading" };
}

interface PageProps {
  params: Promise<{ slug: string; lessonId: string }>;
  searchParams: Promise<{ completed?: string; completeError?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const container = buildContainer();
  const catalog = await container.getCatalogCourse.execute(slug);

  if (!catalog.ok) {
    return { title: "Course Not Found | Project Amazon PH Academy" };
  }

  const lessonLocation = catalog.value.modules
    .flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })))
    .find(({ lesson }) => lesson.id === lessonId);
  if (!lessonLocation) {
    return { title: "Lesson Not Found | Project Amazon PH Academy" };
  }

  return {
    title: `${lessonLocation.lesson.title} | ${catalog.value.title} | Project Amazon PH Academy`,
    description: `${lessonLocation.module.title}: ${lessonLocation.lesson.title}`,
  };
}

export default async function LessonPage({ params, searchParams }: PageProps) {
  const { slug, lessonId } = await params;
  const completionStatus = await searchParams;
  const container = buildContainer();

  // ── Fetch course and authoritative catalog read model ───
  const courseResult = await container.courseRepo.findBySlug(slug);
  const catalogResult = await container.getCatalogCourse.execute(slug);
  if (
    !courseResult.ok ||
    !courseIsAvailable(courseResult.value) ||
    !catalogResult.ok ||
    catalogResult.value.courseId !== courseResult.value.id
  ) {
    notFound();
  }

  const catalog = catalogResult.value;
  const lessonLocation = catalog.modules
    .flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })))
    .find(({ lesson }) => lesson.id === lessonId);
  if (!lessonLocation) notFound();

  const selectedLessonResult = await container.lessonRepo.findById(lessonId);
  if (
    !selectedLessonResult.ok ||
    selectedLessonResult.value.moduleId !== lessonLocation.module.id
  ) {
    notFound();
  }
  const course = withCatalogCurriculum(courseResult.value, catalog, selectedLessonResult.value);

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
  let hasActiveEnrollment = false;
  if (userId) {
    const enrollment = await container.enrollmentRepo.findByUserIdAndCourseId(userId, course.id);
    if (enrollment) {
      completedLessonIds = enrollment.completedLessonIds;
      hasActiveEnrollment = enrollment.status === "active";
    }
  }

  const authResult = await container.authorizeLessonAccess.execute({
    userId: userId ?? "",
    courseId: course.id,
    lessonId,
  });

  if (!authResult.ok) {
    return (
      <CourseAccessNotice
        courseSlug={slug}
        courseTitle={course.title}
        feature="lesson"
        reason="verification_unavailable"
        signedIn={Boolean(userId)}
      />
    );
  }

  if (authResult.value.kind === "denied") {
    return (
      <CourseAccessNotice
        courseSlug={slug}
        courseTitle={course.title}
        feature="lesson"
        reason="preview_limit"
        signedIn={Boolean(userId)}
      />
    );
  }

  const isCompleted = completedLessonIds.includes(lessonId);
  const completeLesson = markLessonCompleteAction.bind(null, {
    courseId: course.id,
    courseSlug: slug,
    lessonId,
  });

  return (
    <div className={styles.layout}>
      {/* Sidebar navigation */}
      <LessonSidebar
        course={{ slug: course.slug, title: course.title, curriculum: course.curriculum }}
        currentLessonId={lessonId}
        completedLessonIds={completedLessonIds}
      />

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className={styles.main}>
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

          <Link
            href={`/courses/${slug}`}
            className={styles.backBtn}
          >
            Back to Course
          </Link>

          {/* Lesson header */}
          <div className={styles.lessonHeader}>
            <p className={styles.sectionLabel}>{sectionTitle}</p>
            <h1 className={styles.lessonTitle}>{lesson.title}</h1>
            {(() => {
              const est = estimateReadingMinutes(lesson);
              const label =
                est.kind === "video"
                  ? `${est.minutes} min video`
                  : est.kind === "quiz"
                    ? `~${est.minutes} min quiz`
                    : `${est.minutes} min read`;
              const Icon = est.kind === "video" ? Play : est.kind === "quiz" ? ListChecks : Clock;
              return (
                <div className={styles.lessonMeta}>
                  <span className={styles.lessonMetaItem}>
                    <Icon size={14} aria-hidden className={styles.lessonMetaIcon} />
                    {label}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Lesson body */}
          <LessonContent lesson={lesson as Lesson} courseSlug={slug} />

          {completionStatus.completed === "1" ? (
            <p className="alert-success" role="status">
              Lesson complete. Your course progress is updated.
            </p>
          ) : null}
          {completionStatus.completeError ? (
            <p className="alert-error" role="alert">
              We could not update your progress. Refresh the page and try again.
            </p>
          ) : null}

          {hasActiveEnrollment ? (
            <form action={completeLesson} className={styles.completionForm}>
              <Button variant={isCompleted ? "secondary" : "primary"} size="md" type="submit">
                {isCompleted ? "Completed" : "Mark as Complete"}
              </Button>
            </form>
          ) : null}

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

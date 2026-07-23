/**
 * /courses/[slug] — Course Detail
 * STORY-014
 *
 * Migrated to CSS Modules + design tokens (no Tailwind classes).
 *
 * Uses buildContainer() with the GetCatalogCourse use case, which
 * fetches the course from the Course table and enriches it with
 * module+lesson data from the Module+Lesson tables (populated by
 * the STORY-013 import script).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import type { CatalogCourseDetail } from "@/usecases/GetCatalogCourse";
import { EnrollButton } from "./EnrollButton";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const container = buildContainer();
  const result = await container.getCatalogCourse.execute(slug);
  if (!result.ok) return { title: "Course Not Found — Project Amazon PH Academy" };
  const detail = result.value;
  return {
    title: `${detail.title} — Project Amazon PH Academy`,
    description: detail.tagline || detail.description.slice(0, 160),
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const container = buildContainer();
  const result = await container.getCatalogCourse.execute(slug);

  if (!result.ok) notFound();

  const detail = result.value;
  const { totalLessonCount, totalEstimatedMinutes, modules } = detail;
  const hours = Math.floor(totalEstimatedMinutes / 60);
  const minutes = totalEstimatedMinutes % 60;
  const priceDisplay =
    detail.priceMinor === 0 ? "FREE" : `₱${(detail.priceMinor / 100).toFixed(2)}`;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/courses" className={styles.backLink}>
            ← Back to Courses
          </Link>

          <div className={styles.headerGrid}>
            {/* Cover */}
            {detail.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.coverImage} alt={detail.title} className={styles.cover} />
            ) : (
              <div className={styles.coverPlaceholder}>
                <span className={styles.coverPlaceholderLetter}>{detail.title[0]}</span>
              </div>
            )}

            <div className={styles.headerBody}>
              <h1 className={styles.title}>{detail.title}</h1>
              {detail.tagline && <p className={styles.tagline}>{detail.tagline}</p>}
              <p className={styles.description}>{detail.description}</p>

              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <BookIcon /> {totalLessonCount} lesson{totalLessonCount !== 1 ? "s" : ""}
                </span>
                {totalEstimatedMinutes > 0 && (
                  <span className={styles.metaItem}>
                    <ClockIcon /> {hours > 0 ? `${hours}h ` : ""}
                    {minutes}m video
                  </span>
                )}
                <span className={styles.price}>{priceDisplay}</span>
              </div>

              <EnrollButton
                courseId={detail.courseId}
                courseSlug={detail.slug}
                priceMinor={detail.priceMinor}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className={styles.curriculumSection}>
        <h2 className={styles.curriculumTitle}>Curriculum</h2>
        <div className={styles.sectionList}>
          {modules.map((mod, si) => (
            <details key={mod.id} className={styles.section} open={si === 0}>
              <summary className={styles.sectionSummary}>
                <span className={styles.sectionTitle}>
                  Section {si + 1}: {mod.title}
                </span>
                <span className={styles.sectionChevron}>▼</span>
              </summary>
              <ul className={styles.lessonList}>
                {mod.lessons.map((lesson) => {
                  const vid = lesson.estimatedMinutes > 0 ? `${lesson.estimatedMinutes}m` : null;
                  return (
                    <li key={lesson.id} className={styles.lessonItem}>
                      <LessonTypeIcon type={lesson.type} />
                      <Link
                        href={`/courses/${detail.slug}/lessons/${lesson.id}`}
                        className={styles.lessonLink}
                      >
                        {lesson.title}
                      </Link>
                      {vid && <span className={styles.lessonDuration}>{vid}</span>}
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}

function BookIcon() {
  return (
    <svg
      className={styles.metaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className={styles.metaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LessonTypeIcon({ type }: { type: string }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "aria-hidden": "true",
    className: styles.lessonIcon,
  } as const;
  if (type === "VIDEO") {
    return (
      <svg {...commonProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (type === "QUIZ") {
    return (
      <svg {...commonProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

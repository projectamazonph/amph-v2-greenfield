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
 *
 * ISR: course content changes rarely (only on deploy via the import
 * script). Revalidate every hour to avoid hitting PostgreSQL on
 * every request while staying reasonably fresh.
 */

import Link from "next/link";

import { StudentShell } from "@/components/student/StudentShell";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildContainer } from "@/composition/container";
import type { CatalogCourseDetail } from "@/usecases/GetCatalogCourse";
import { EnrollButton } from "./EnrollButton";
import { ShareCourseButton } from "@/components/courses/ShareCourseButton";
import { getSessionUser } from "@/lib/auth";
import { CourseCover } from "@/components/student/CourseCover";
import { Money } from "@/domain/values/Money";
import { MODULE_COVER_IMAGES } from "@/lib/moduleCoverImages";
import { ArrowLeft, Book, Clock, Play, Article, CheckSquare } from "@phosphor-icons/react/dist/ssr";
import { isLessonUnlocked, orderLearnerModules } from "@/domain/curriculum/GuidedFlow";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const container = buildContainer();
  const result = await container.getCatalogCourse.execute(slug);
  if (!result.ok) return { title: "Course Not Found | Project Amazon PH Academy" };
  const detail = result.value;
  return {
    title: `${detail.title} | Project Amazon PH Academy`,
    description: detail.tagline || detail.description.slice(0, 160),
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const container = buildContainer();
  const result = await container.getCatalogCourse.execute(slug);

  if (!result.ok) notFound();

  const detail = result.value;
  const [user, quizzesResult] = await Promise.all([
    getSessionUser(),
    container.quizRepo.findByCourseId(detail.courseId),
  ]);
  if (!quizzesResult.ok) {
    // Use empty array as fallback
    const quizzes = [];
  }
  const quizzes = quizzesResult.ok ? quizzesResult.value : [];
  const enrollment = user
    ? await container.enrollmentRepo.findByUserIdAndCourseId(user.id, detail.courseId)
    : null;
  let accessMode: "purchase" | "subscription" | "enrolled" | "admin" = "purchase";
  if (user) {
    if (enrollment?.status === "active") {
      accessMode = "enrolled";
    } else if (user.role === "ADMIN") {
      accessMode = "admin";
    } else {
      const accessResult = await container.checkCourseAccess.execute({
        userId: user.id,
        courseId: detail.courseId,
      });
      if (accessResult.ok && accessResult.value.kind === "allowed") {
        accessMode = "subscription";
      }
    }
  }
  const { totalLessonCount, totalEstimatedMinutes } = detail;
  const modules = orderLearnerModules(detail.modules);
  const firstLessonId = modules.flatMap((module) => module.lessons)[0]?.id ?? null;
  const guidedSections = modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: module.lessons,
  }));
  const courseLessons = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, sectionTitle: module.title })),
  );
  const completedLessonIds = enrollment?.status === "active" ? enrollment.completedLessonIds : [];
  const completedLessonCount = courseLessons.filter((lesson) =>
    completedLessonIds.includes(lesson.id),
  ).length;
  const progressPercent =
    courseLessons.length > 0 ? Math.floor((completedLessonCount / courseLessons.length) * 100) : 0;
  const nextLesson = courseLessons.find((lesson) => !completedLessonIds.includes(lesson.id));
  const hours = Math.floor(totalEstimatedMinutes / 60);
  const minutes = totalEstimatedMinutes % 60;
  const priceMoney = Money.of(detail.priceMinor, "PHP");
  const priceDisplay = detail.priceMinor === 0 ? "FREE" : priceMoney.ok ? priceMoney.value.format("en-PH") : "FREE";

  return (
    <StudentShell requireAuth={false} user={user}>
      <main id="main-content" className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/courses" className={styles.backLink}>
              <ArrowLeft size={16} weight="regular" />
              Back to Courses
            </Link>

            <div className={styles.headerGrid}>
              {/* Cover */}
              <CourseCover
                title={detail.title}
                slug={detail.slug}
                coverImage={detail.coverImage}
                width={576}
                height={384}
                fetchPriority="high"
                className={styles.cover}
              />

              <div className={styles.headerBody}>
                <h1 className={styles.title}>{detail.title}</h1>
                {detail.tagline && <p className={styles.tagline}>{detail.tagline}</p>}
                <p className={styles.description}>{detail.description}</p>

                <div className={styles.meta}>
                  {totalLessonCount > 0 ? (
                    <>
                      <span className={styles.metaItem}>
                        <Book size={16} weight="regular" className={styles.metaIcon} aria-hidden />
                        {totalLessonCount} lesson{totalLessonCount !== 1 ? "s" : ""}
                      </span>
                      <span className={styles.metaDivider}>·</span>
                      {totalEstimatedMinutes > 0 && (
                        <span className={styles.metaItem}>
                          <Clock
                            size={16}
                            weight="regular"
                            className={styles.metaIcon}
                            aria-hidden
                          />
                          {hours > 0 ? `${hours}h ` : ""}
                          {minutes}m learning time
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={styles.metaItem}>Live cohort + 1:1 review</span>
                  )}
                  <span className={styles.price}>{priceDisplay}</span>
                </div>

                <EnrollButton
                  courseId={detail.courseId}
                  courseSlug={detail.slug}
                  priceMinor={detail.priceMinor}
                  accessMode={accessMode}
                  firstLessonId={firstLessonId}
                />
                <ShareCourseButton title={detail.title} />
              </div>
            </div>
          </div>
        </div>

        {accessMode !== "purchase" && totalLessonCount > 0 ? (
          <section className={styles.progressPanel} aria-labelledby="course-progress-title">
            <div className={styles.progressCopy}>
              <p className={styles.progressEyebrow}>Your course progress</p>
              <h2 id="course-progress-title" className={styles.progressTitle}>
                {completedLessonCount} of {courseLessons.length} lessons complete
              </h2>
              <p className={styles.progressHint}>
                {progressPercent === 100
                  ? "You have completed the available lessons. Revisit any lesson to sharpen the system."
                  : nextLesson
                    ? `${nextLesson.sectionTitle} · ${nextLesson.title}`
                    : "Your next lesson is ready."}
              </p>
            </div>
            <div className={styles.progressAction}>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Course progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <strong className={styles.progressValue}>{progressPercent}%</strong>
              {nextLesson ? (
                <Link
                  href={`/courses/${detail.slug}/lessons/${nextLesson.id}`}
                  className={styles.progressCta}
                >
                  {progressPercent === 0 ? "Start first lesson" : "Continue next lesson"}
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {slug === "ppc-foundations" ? (
          <section className={styles.orientationPanel} aria-labelledby="guided-path-title">
            <p className={styles.orientationEyebrow}>Start here · zero-knowledge path</p>
            <h2 id="guided-path-title" className={styles.orientationTitle}>
              Learn the loop before the levers
            </h2>
            <p className={styles.orientationBody}>
              You do not need Amazon or advertising experience. We define the words, show a small
              example, ask you to retrieve the idea, and only then introduce a safe PPC decision.
            </p>
            <ol className={styles.orientationSteps}>
              <li>
                <strong>1. Vocabulary</strong>Understand the marketplace, listing, click, keyword,
                and approval boundary.
              </li>
              <li>
                <strong>2. Evidence</strong>Read the metrics and listing signals before choosing a
                lever.
              </li>
              <li>
                <strong>3. One decision</strong>Make a bounded, reversible decision with a stated
                reason.
              </li>
              <li>
                <strong>4. Proof</strong>Record what you saw, what you did, and when you will review
                it.
              </li>
            </ol>
          </section>
        ) : null}

        {/* Curriculum */}
        <div className={styles.curriculumSection}>
          <h2 className={styles.curriculumTitle}>Curriculum</h2>
          <div className={styles.sectionList}>
            {modules.map((mod, si) => {
              const coverImage = MODULE_COVER_IMAGES[mod.title];

              return (
                <details key={mod.id} className={styles.section} open={si === 0}>
                  <summary className={styles.sectionSummary}>
                    {coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImage} alt="" className={styles.sectionCoverImage} />
                    )}
                    <span className={styles.sectionTitle}>
                      Section {si + 1}: {mod.title}
                    </span>
                    <span className={styles.sectionChevron}>▼</span>
                  </summary>
                  <ul className={styles.lessonList}>
                    {mod.lessons.map((lesson) => {
                      const vid =
                        lesson.estimatedMinutes > 0 ? `${lesson.estimatedMinutes}m` : null;
                      const isCompleted = completedLessonIds.includes(lesson.id);
                      const isUnlocked =
                        accessMode === "purchase" ||
                        isLessonUnlocked(guidedSections, completedLessonIds, lesson.id);
                      return (
                        <li
                          key={lesson.id}
                          className={`${styles.lessonItem} ${isUnlocked ? "" : styles.lessonItemLocked}`}
                        >
                          <LessonTypeIcon type={lesson.type} />
                          {isUnlocked ? (
                            <Link
                              href={`/courses/${detail.slug}/lessons/${lesson.id}`}
                              className={styles.lessonLink}
                            >
                              {lesson.title}
                            </Link>
                          ) : (
                            <span
                              className={styles.lessonLinkLocked}
                              aria-label={`${lesson.title} locked until the previous lesson is complete`}
                            >
                              {lesson.title}
                            </span>
                          )}
                          {vid && <span className={styles.lessonDuration}>{vid}</span>}
                          {accessMode !== "purchase" && (
                            <span
                              className={styles.lessonStatus}
                              data-complete={isCompleted}
                              data-locked={!isUnlocked}
                            >
                              {isCompleted
                                ? "Complete"
                                : isUnlocked
                                  ? "Ready"
                                  : "Locked · finish previous"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>

          {quizzes.length > 0 ? (
            <section className={styles.quizSection} aria-labelledby="course-quizzes-title">
              <h2 id="course-quizzes-title" className={styles.curriculumTitle}>
                Knowledge checks
              </h2>
              <ul className={styles.quizList}>
                {quizzes.map((quiz) => (
                  <li key={quiz.id} className={styles.quizItem}>
                    <div>
                      <h3 className={styles.quizTitle}>{quiz.title}</h3>
                      <p className={styles.quizMeta}>
                        {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
                        {" · "}
                        Pass at {quiz.passingScore}%
                      </p>
                    </div>
                    <Link
                      href={`/courses/${detail.slug}/quizzes/${quiz.id}`}
                      className={styles.quizCta}
                    >
                      Take quiz
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </StudentShell>
  );
}

function LessonTypeIcon({ type }: { type: string }) {
  if (type === "VIDEO") {
    return <Play size={16} weight="fill" className={styles.lessonIcon} aria-hidden />;
  }
  if (type === "QUIZ") {
    return <CheckSquare size={16} weight="fill" className={styles.lessonIcon} aria-hidden />;
  }
  return <Article size={16} weight="fill" className={styles.lessonIcon} aria-hidden />;
}

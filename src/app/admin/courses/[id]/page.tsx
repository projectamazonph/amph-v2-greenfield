/**
 * /admin/courses/[id] — admin course detail (read-only).
 *
 * STORY-048a. Server component.
 *
 * Shows the course's fields + an Archive button. "Edit" links to
 * /admin/courses/[id]/edit. Modules / Lessons sections are
 * placeholders (STORY-048b/c).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import { archiveCourseAction } from "@/app/actions/archiveCourse.action";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetCourse.execute({ courseId: id });

  if (!result.ok) {
    if (result.error.kind === "course_not_found") {
      notFound();
    }
    return (
      <div>
        <TopBar title="Error" />
        <Card padding="comfortable">
          <p className={styles.error}>
            Failed to load course: {result.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const course = result.value.course;
  const createdDate = course.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleArchive() {
    "use server";
    const r = await archiveCourseAction({ courseId: id });
    if (r.ok) {
      redirect(`/admin/courses/${id}`);
    }
  }

  return (
    <div>
      <Link href="/admin/courses" className={styles.backLink}>
        ← Back to courses
      </Link>

      <TopBar
        title={course.title}
        subtitle={
          <span className={styles.badges}>
            <Badge
              variant={
                course.status === "PUBLISHED"
                  ? "accent"
                  : course.status === "ARCHIVED"
                    ? "neutral"
                    : "warning"
              }
            >
              {course.status}
            </Badge>
            <Badge variant={course.courseTier === "PRO" ? "accent" : "neutral"}>
              {course.courseTier}
            </Badge>
            {course.isFeatured && <Badge variant="warning">Featured</Badge>}
          </span>
        }
        actions={
          <div className={styles.actions}>
            <Link href={`/admin/courses/${course.id}/edit`} className={styles.editButton}>
              Edit
            </Link>
            {course.status !== "ARCHIVED" && (
              <form action={handleArchive}>
                <button type="submit" className={styles.archiveButton}>
                  Archive
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className={styles.grid}>
        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Basics</h2>
          <dl className={styles.details}>
            <dt>Slug</dt>
            <dd className={styles.mono}>{course.slug}</dd>
            <dt>Tagline</dt>
            <dd>{course.tagline || <em className={styles.muted}>—</em>}</dd>
            <dt>Description</dt>
            <dd>{course.description || <em className={styles.muted}>—</em>}</dd>
            <dt>Created</dt>
            <dd className={styles.mono}>{createdDate}</dd>
          </dl>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Pricing & access</h2>
          <dl className={styles.details}>
            <dt>Price</dt>
            <dd className={styles.mono}>{formatPhp(course.price.minor)}</dd>
            <dt>Course tier</dt>
            <dd>{course.courseTier}</dd>
            <dt>Preview lessons</dt>
            <dd className={styles.mono}>{course.previewLessonCount}</dd>
            <dt>Display order</dt>
            <dd className={styles.mono}>{course.displayOrder}</dd>
            <dt>Cover image</dt>
            <dd>
              {course.coverImage ? (
                <a href={course.coverImage} target="_blank" rel="noopener noreferrer">
                  {course.coverImage}
                </a>
              ) : (
                <em className={styles.muted}>—</em>
              )}
            </dd>
          </dl>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Curriculum (placeholder)</h2>
          <dl className={styles.details}>
            <dt>Sections</dt>
            <dd className={styles.mono}>{course.curriculum.sections.length}</dd>
            <dt>Lessons</dt>
            <dd className={styles.mono}>{courseLessonCount(course)}</dd>
            <dt>Video duration</dt>
            <dd className={styles.mono}>
              {courseTotalDurationMinutes(course)} min
            </dd>
          </dl>
          <p className={styles.placeholder}>
            Modules and lessons editing lands in{" "}
            <strong>STORY-048b</strong> and <strong>STORY-048c</strong>.
            For now, the curriculum has the default 1-section / 1-lesson
            shape that was set when the course was created.
          </p>
        </Card>
      </div>
    </div>
  );
}

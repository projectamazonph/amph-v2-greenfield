/**
 * /admin/courses/[id] — admin course detail (read-only).
 *
 * STORY-048a + STORY-048b. Server component.
 *
 * Shows the course's fields + an Archive button + a live modules
 * section (added in 048b). Lessons section is still a placeholder
 * (STORY-048c).
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { Badge } from "@astryxdesign/core";
import { formatPhp } from "@/app/admin/_lib/formatPhp";
import { courseLessonCount, courseTotalDurationMinutes } from "@/domain/entities/Course";
import { archiveCourseAction } from "@/app/actions/archiveCourse.action";
import { deleteModuleAction } from "@/app/actions/deleteModule.action";
import { reorderModulesAction } from "@/app/actions/reorderModules.action";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdmin();

  const container = buildContainer();
  const courseResult = await container.adminGetCourse.execute({ courseId: id });
  const modulesResult = await container.adminListModules.execute({ courseId: id });

  if (!courseResult.ok) {
    if (courseResult.error.kind === "course_not_found") {
      notFound();
    }
    return (
      <div>
        <TopBar title="Error" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load course: {courseResult.error.message}</p>
        </Card>
      </div>
    );
  }

  const course = courseResult.value.course;
  const modules = modulesResult.ok ? modulesResult.value.modules : [];

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

  async function handleDeleteModule(moduleId: string) {
    "use server";
    await deleteModuleAction({ moduleId });
  }

  async function handleMoveModule(moduleId: string, direction: "up" | "down") {
    "use server";
    if (modules.length < 2) return;
    const current = [...modules].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = current.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= current.length) return;
    const newOrder = [...current];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx]!, newOrder[idx]!];
    await reorderModulesAction({
      courseId: id,
      moduleIds: newOrder.map((m) => m.id),
    });
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
                  ? "orange"
                  : course.status === "ARCHIVED"
                    ? "neutral"
                    : "warning"
              }
              label={course.status}
            />
            <Badge
              variant={course.courseTier === "PRO" ? "orange" : "neutral"}
              label={course.courseTier}
            />
            {course.isFeatured && <Badge variant="warning" label="Featured" />}
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
        <Card padding={6}>
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

        <Card padding={6}>
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

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Curriculum (legacy)</h2>
          <dl className={styles.details}>
            <dt>Sections</dt>
            <dd className={styles.mono}>{course.curriculum.sections.length}</dd>
            <dt>Lessons</dt>
            <dd className={styles.mono}>{courseLessonCount(course)}</dd>
            <dt>Video duration</dt>
            <dd className={styles.mono}>{courseTotalDurationMinutes(course)} min</dd>
          </dl>
          <p className={styles.placeholder}>
            The legacy <code>Course.curriculum</code> JSON blob is still shown for backward compat.
            The <strong>Modules</strong> section below is the new admin surface (STORY-048b).
          </p>
        </Card>

        <Card padding={6}>
          <div className={styles.modulesHeader}>
            <h2 className={styles.sectionTitle}>Modules</h2>
            <Link href={`/admin/courses/${course.id}/modules/new`} className={styles.addButton}>
              + Add module
            </Link>
          </div>
          {modules.length === 0 ? (
            <p className={styles.muted}>
              No modules yet. Add the first module to start building the curriculum.
            </p>
          ) : (
            <ul className={styles.moduleList}>
              {[...modules]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((m, idx, arr) => (
                  <li key={m.id} className={styles.moduleItem}>
                    <div className={styles.moduleRow}>
                      <span className={styles.moduleOrder}>{m.displayOrder}.</span>
                      <Link
                        href={`/admin/courses/${course.id}/modules/${m.id}`}
                        className={styles.moduleTitle}
                      >
                        {m.title}
                      </Link>
                      <div className={styles.moduleActions}>
                        <form action={handleMoveModule.bind(null, m.id, "up")}>
                          <button
                            type="submit"
                            className={styles.reorderButton}
                            disabled={idx === 0}
                            aria-label={`Move ${m.title} up`}
                          >
                            ↑
                          </button>
                        </form>
                        <form action={handleMoveModule.bind(null, m.id, "down")}>
                          <button
                            type="submit"
                            className={styles.reorderButton}
                            disabled={idx === arr.length - 1}
                            aria-label={`Move ${m.title} down`}
                          >
                            ↓
                          </button>
                        </form>
                        <Link
                          href={`/admin/courses/${course.id}/modules/${m.id}/edit`}
                          className={styles.editLink}
                        >
                          Edit
                        </Link>
                        <form action={handleDeleteModule.bind(null, m.id)}>
                          <button
                            type="submit"
                            className={styles.deleteButton}
                            aria-label={`Delete ${m.title}`}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

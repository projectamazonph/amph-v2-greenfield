/**
 * /admin/courses/[id]/modules/[moduleId] — module detail (read-only).
 *
 * STORY-048b + STORY-048c. Server component.
 *
 * Shows the module's fields + a live lessons section (added in 048c)
 * with reorder + edit + delete + add-new.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { Badge } from "@astryxdesign/core";
import { deleteModuleAction } from "@/app/actions/deleteModule.action";
import { reorderModulesAction } from "@/app/actions/reorderModules.action";
import { deleteLessonAction } from "@/app/actions/deleteLesson.action";
import { reorderLessonsAction } from "@/app/actions/reorderLessons.action";
import styles from "../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { id: courseId, moduleId } = await params;
  await requireAdmin();

  const container = buildContainer();
  const moduleResult = await container.adminGetModule.execute({ moduleId });
  const lessonsResult = await container.adminListLessons.execute({ moduleId });

  if (!moduleResult.ok) {
    notFound();
  }
  const mod = moduleResult.value.module;
  if (mod.courseId !== courseId) {
    notFound();
  }
  const lessons = lessonsResult.ok ? lessonsResult.value.lessons : [];

  const created = mod.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updated = mod.updatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleDelete() {
    "use server";
    await deleteModuleAction({ moduleId });
    redirect(`/admin/courses/${courseId}`);
  }

  async function handleDeleteLesson(lessonId: string) {
    "use server";
    await deleteLessonAction({ lessonId });
  }

  async function handleMoveLesson(lessonId: string, direction: "up" | "down") {
    "use server";
    if (lessons.length < 2) return;
    const current = [...lessons].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = current.findIndex((l) => l.id === lessonId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= current.length) return;
    const newOrder = [...current];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx]!, newOrder[idx]!];
    await reorderLessonsAction({
      moduleId,
      lessonIds: newOrder.map((l) => l.id),
    });
  }

  return (
    <div>
      <Link href={`/admin/courses/${courseId}`} className={styles.backLink}>
        ← Back to course
      </Link>

      <TopBar
        title={mod.title}
        subtitle={
          <span className={styles.badges}>
            <Badge variant="neutral" label={"Order " + mod.displayOrder} />
          </span>
        }
        actions={
          <div className={styles.actions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${mod.id}/edit`}
              className={styles.editButton}
            >
              Edit
            </Link>
            <form action={handleDelete}>
              <button type="submit" className={styles.archiveButton}>
                Delete
              </button>
            </form>
          </div>
        }
      />

      <div className={styles.grid}>
        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Basics</h2>
          <dl className={styles.details}>
            <dt>ID</dt>
            <dd className={styles.mono}>{mod.id}</dd>
            <dt>Title</dt>
            <dd>{mod.title}</dd>
            <dt>Display order</dt>
            <dd className={styles.mono}>{mod.displayOrder}</dd>
            <dt>Created</dt>
            <dd className={styles.mono}>{created}</dd>
            <dt>Updated</dt>
            <dd className={styles.mono}>{updated}</dd>
          </dl>
        </Card>

        <Card padding={6}>
          <div className={styles.modulesHeader}>
            <h2 className={styles.sectionTitle}>Lessons</h2>
            <Link
              href={`/admin/courses/${courseId}/modules/${mod.id}/lessons/new`}
              className={styles.addButton}
            >
              + Add lesson
            </Link>
          </div>
          {lessons.length === 0 ? (
            <p className={styles.muted}>
              No lessons yet. Add the first lesson to start building the module.
            </p>
          ) : (
            <ul className={styles.moduleList}>
              {[...lessons]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((l, idx, arr) => (
                  <li key={l.id} className={styles.moduleItem}>
                    <div className={styles.moduleRow}>
                      <span className={styles.moduleOrder}>{l.displayOrder}.</span>
                      <Link
                        href={`/admin/courses/${courseId}/modules/${mod.id}/lessons/${l.id}`}
                        className={styles.moduleTitle}
                      >
                        {l.title}
                      </Link>
                      <Badge variant="orange" label={l.type} />
                      <div className={styles.moduleActions}>
                        <form action={handleMoveLesson.bind(null, l.id, "up")}>
                          <button
                            type="submit"
                            className={styles.reorderButton}
                            disabled={idx === 0}
                            aria-label={`Move ${l.title} up`}
                          >
                            ↑
                          </button>
                        </form>
                        <form action={handleMoveLesson.bind(null, l.id, "down")}>
                          <button
                            type="submit"
                            className={styles.reorderButton}
                            disabled={idx === arr.length - 1}
                            aria-label={`Move ${l.title} down`}
                          >
                            ↓
                          </button>
                        </form>
                        <Link
                          href={`/admin/courses/${courseId}/modules/${mod.id}/lessons/${l.id}/edit`}
                          className={styles.editLink}
                        >
                          Edit
                        </Link>
                        <form action={handleDeleteLesson.bind(null, l.id)}>
                          <button
                            type="submit"
                            className={styles.deleteButton}
                            aria-label={`Delete ${l.title}`}
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

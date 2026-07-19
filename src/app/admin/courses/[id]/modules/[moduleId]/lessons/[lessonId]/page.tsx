/**
 * /admin/courses/[id]/modules/[moduleId]/lessons/[lessonId] — lesson detail.
 *
 * STORY-048c. Server component. Read-only.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card, Badge } from "@/components/ui";
import { deleteLessonAction } from "@/app/actions/deleteLesson.action";
import styles from "../../../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}

function renderContentSummary(lesson: {
  type: "VIDEO" | "TEXT" | "QUIZ";
  content: unknown;
}): { label: string; value: string }[] {
  if (lesson.type === "VIDEO") {
    const c = lesson.content as { durationMinutes?: number };
    return [
      { label: "Type", value: "VIDEO" },
      { label: "Duration", value: `${c.durationMinutes ?? "?"} min` },
    ];
  }
  if (lesson.type === "TEXT") {
    const c = lesson.content as { body?: string };
    return [
      { label: "Type", value: "TEXT" },
      {
        label: "Body (preview)",
        value: (c.body ?? "").slice(0, 200),
      },
    ];
  }
  // QUIZ
  const c = lesson.content as { questions?: { id: string; prompt: string; options: readonly string[]; correctOptionIndex: number }[] };
  return [
    { label: "Type", value: "QUIZ" },
    { label: "Questions", value: String(c.questions?.length ?? 0) },
  ];
}

export default async function LessonDetailPage({ params }: PageProps) {
  const { id: courseId, moduleId, lessonId } = await params;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetLesson.execute({ lessonId });
  if (!result.ok) {
    notFound();
  }
  const lesson = result.value.lesson;
  if (lesson.moduleId !== moduleId) {
    notFound();
  }

  const created = lesson.createdAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const updated = lesson.updatedAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const rows = renderContentSummary(lesson);

  async function handleDelete() {
    "use server";
    await deleteLessonAction({ lessonId });
    redirect(`/admin/courses/${courseId}/modules/${moduleId}`);
  }

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}/modules/${moduleId}`}
        className={styles.backLink}
      >
        ← Back to module
      </Link>

      <TopBar
        title={lesson.title}
        subtitle={
          <span className={styles.badges}>
            <Badge variant="neutral">Order {lesson.displayOrder}</Badge>
            <Badge variant="accent">{lesson.type}</Badge>
          </span>
        }
        actions={
          <div className={styles.actions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/edit`}
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

      <Card padding="comfortable">
        <dl className={styles.details}>
          <dt>ID</dt>
          <dd className={styles.mono}>{lesson.id}</dd>
          <dt>Title</dt>
          <dd>{lesson.title}</dd>
          <dt>Type</dt>
          <dd>{lesson.type}</dd>
          <dt>Display order</dt>
          <dd className={styles.mono}>{lesson.displayOrder}</dd>
          {rows.map((row) => (
            <>
              <dt key={`label-${row.label}`}>{row.label}</dt>
              <dd key={`value-${row.label}`}>{row.value}</dd>
            </>
          ))}
          <dt>Created</dt>
          <dd className={styles.mono}>{created}</dd>
          <dt>Updated</dt>
          <dd className={styles.mono}>{updated}</dd>
        </dl>

        <p className={styles.placeholder}>
          The full content JSON is shown on the edit page. The MDX/text
          editor for TEXT lessons lands in <strong>STORY-048c.5</strong>.
        </p>
      </Card>
    </div>
  );
}

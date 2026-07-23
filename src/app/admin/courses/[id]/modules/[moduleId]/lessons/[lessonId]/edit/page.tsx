/**
 * /admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit — edit a lesson.
 *
 * STORY-048c. Server component.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateLessonAction } from "@/app/actions/updateLesson.action";
import styles from "../../../../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}

export default async function EditLessonPage({ params }: PageProps) {
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

  const contentJson = JSON.stringify(lesson.content, null, 2);

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const type = String(formData.get("type") ?? "TEXT") as "VIDEO" | "TEXT" | "QUIZ";
    const contentJson = String(formData.get("contentJson") ?? "{}");
    if (!title) {
      redirect(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/edit?error=missing_title`,
      );
    }
    const r = await updateLessonAction({
      lessonId,
      title,
      type,
      contentJson,
    });
    if (r.ok) {
      redirect(`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
    }
    const kind =
      r.error.kind === "invalid_content_json"
        ? "invalid_content_json"
        : r.error.kind === "invalid_input"
          ? "invalid_input"
          : r.error.kind === "lesson_not_found"
            ? "not_found"
            : "server_error";
    redirect(
      `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/edit?error=${kind}`,
    );
  }

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`}
        className={styles.backLink}
      >
        ← Back to lesson
      </Link>

      <TopBar title={`Edit "${lesson.title}"`} />

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              autoFocus
              defaultValue={lesson.title}
              className={styles.input}
            />
          </label>

          <fieldset className={styles.field}>
            <legend className={styles.label}>Type</legend>
            <label>
              <input
                type="radio"
                name="type"
                value="VIDEO"
                defaultChecked={lesson.type === "VIDEO"}
              />{" "}
              Video
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="TEXT"
                defaultChecked={lesson.type === "TEXT"}
              />{" "}
              Text
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="QUIZ"
                defaultChecked={lesson.type === "QUIZ"}
              />{" "}
              Quiz
            </label>
          </fieldset>

          <label className={styles.field}>
            <span className={styles.label}>Content (JSON)</span>
            <span className={styles.hint}>Switching the type re-validates the JSON shape.</span>
            <textarea
              name="contentJson"
              required
              rows={16}
              className={`${styles.textarea} ${styles.codeArea}`}
              defaultValue={contentJson}
            />
          </label>

          <div className={styles.formActions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

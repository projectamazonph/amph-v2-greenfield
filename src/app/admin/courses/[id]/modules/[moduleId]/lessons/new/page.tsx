/**
 * /admin/courses/[id]/modules/[moduleId]/lessons/new — create a lesson.
 *
 * STORY-048c. Server component.
 *
 * The form is type-aware: the user picks VIDEO / TEXT / QUIZ via
 * radio buttons and the appropriate content field appears. We can't
 * do conditional server-side rendering on radio state, so we just
 * render all 3 content fields and use a client-side hint. For
 * simplicity (and to keep this in the server-component lane), the
 * form just shows all 3 fields and the user fills in the one they
 * need. The content is sent as a JSON string and parsed by the
 * server action.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import { createLessonAction } from "@/app/actions/createLesson.action";
import styles from "../../../../../../courses.module.css";

interface PageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function NewLessonPage({ params }: PageProps) {
  const { id: courseId, moduleId } = await params;
  await requireAdmin();

  const container = buildContainer();
  const moduleResult = await container.adminGetModule.execute({ moduleId });
  if (!moduleResult.ok) {
    notFound();
  }
  const mod = moduleResult.value.module;
  if (mod.courseId !== courseId) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const type = String(formData.get("type") ?? "TEXT") as "VIDEO" | "TEXT" | "QUIZ";
    const contentJson = String(formData.get("contentJson") ?? "{}");
    if (!title) {
      redirect(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons/new?error=missing_title`,
      );
    }
    const r = await createLessonAction({
      moduleId,
      title,
      type,
      contentJson,
    });
    if (r.ok) {
      redirect(`/admin/courses/${courseId}/modules/${moduleId}`);
    }
    const kind =
      r.error.kind === "invalid_content_json"
        ? "invalid_content_json"
        : r.error.kind === "invalid_input"
          ? "invalid_input"
          : "server_error";
    redirect(
      `/admin/courses/${courseId}/modules/${moduleId}/lessons/new?error=${kind}`,
    );
  }

  const defaultVideo = JSON.stringify({ durationMinutes: 5 }, null, 2);
  const defaultText = JSON.stringify({ body: "# Hello\n\nWrite lesson content here." }, null, 2);
  const defaultQuiz = JSON.stringify(
    {
      questions: [
        {
          id: "q1",
          prompt: "What is 2 + 2?",
          options: ["3", "4", "5"],
          correctOptionIndex: 1,
        },
      ],
    },
    null,
    2,
  );

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}/modules/${moduleId}`}
        className={styles.backLink}
      >
        ← Back to module
      </Link>

      <TopBar
        title={`Add lesson to "${mod.title}"`}
        subtitle="Pick a type and fill in the content (sent as JSON)."
      />

      <Card padding="comfortable">
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              autoFocus
              className={styles.input}
              placeholder="e.g. Welcome to the course"
            />
          </label>

          <fieldset className={styles.field}>
            <legend className={styles.label}>Type</legend>
            <label>
              <input type="radio" name="type" value="VIDEO" defaultChecked />{" "}
              Video
            </label>
            <label>
              <input type="radio" name="type" value="TEXT" /> Text
            </label>
            <label>
              <input type="radio" name="type" value="QUIZ" /> Quiz
            </label>
          </fieldset>

          <label className={styles.field}>
            <span className={styles.label}>
              Content (JSON)
            </span>
            <span className={styles.hint}>
              VIDEO: <code>{`{ "durationMinutes": 5 }`}</code> · TEXT:{" "}
              <code>{`{ "body": "..." }`}</code> · QUIZ:{" "}
              <code>{`{ "questions": [...] }`}</code>
            </span>
            <textarea
              name="contentJson"
              required
              rows={12}
              className={`${styles.textarea} ${styles.codeArea}`}
              defaultValue={defaultVideo}
            />
          </label>

          <p className={styles.hint}>
            Quick fill (paste into the textarea):
            <br />
            <code>VIDEO</code>: <code>{defaultVideo}</code>
            <br />
            <code>TEXT</code>: <code>{defaultText}</code>
            <br />
            <code>QUIZ</code>: <code>{defaultQuiz}</code>
          </p>

          <div className={styles.formActions}>
            <Link
              href={`/admin/courses/${courseId}/modules/${moduleId}`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Create lesson
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

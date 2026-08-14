/**
 * /admin/quizzes/[quizId]/edit — admin edit quiz form.
 *
 * STORY-091 (US-006). Server component. Loads the quiz via
 * AdminGetQuiz, renders the same QuizEditor used by /new with the
 * existing questions/options as `initial`, and posts to updateQuizAction.
 */
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateQuizAction } from "@/app/actions/updateQuiz.action";
import { deleteQuizAction } from "@/app/actions/deleteQuiz.action";
import { QuizEditor, type EditorQuestion } from "@/components/admin/QuizEditor";
import styles from "../../new/page.module.css";

interface PageProps {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Quiz no longer exists.",
  invalid_id: "Quiz ID is required.",
  invalid_course_id: "Course ID is required.",
  invalid_title: "Title is required.",
  invalid_passing_score: "Passing score must be between 0 and 100.",
  no_questions: "Add at least one question.",
  question_missing_correct_option: "Each question must have exactly one correct option.",
  question_multiple_correct_options: "Each question must have exactly one correct option.",
  has_attempts: "Cannot delete a quiz that has attempts. Reassign or remove them first.",
  db_error: "Database error. Try again.",
  unauthorized: "You must be an admin to edit a quiz.",
};

export default async function EditQuizPage({ params, searchParams }: PageProps) {
  const { quizId } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetQuiz.execute({ quizId });

  if (!result.ok) {
    if (result.error.kind === "quiz_not_found") notFound();
    throw new Error(`Failed to load quiz: ${result.error.kind}`);
  }
  const { quiz, course } = result.value;

  const initial: EditorQuestion[] = quiz.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    options: q.options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      isCorrect: o.isCorrect,
    })),
  }));

  const errorMsg = sp.error ? (ERROR_MESSAGES[sp.error] ?? `Error: ${sp.error}`) : null;

  return (
    <div>
      <Link href="/admin/quizzes" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to quizzes
      </Link>

      <TopBar
        title={`Edit: ${quiz.title}`}
        subtitle={`${course.title} · ${quiz.questions.length} questions`}
      />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleUpdate(quiz.id)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Quiz ID (read-only)</span>
            <input
              type="text"
              disabled
              defaultValue={quiz.id}
              className={styles.input}
              style={{ fontFamily: "monospace", backgroundColor: "var(--surface-2, #f4f4f5)" }}
            />
            <span className={styles.hint}>Quiz IDs cannot be changed after creation.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Course (read-only)</span>
            <input
              type="text"
              disabled
              defaultValue={course.title}
              className={styles.input}
              style={{ backgroundColor: "var(--surface-2, #f4f4f5)" }}
            />
            <span className={styles.hint}>
              Course cannot be changed after creation. Create a new quiz if you need a different
              course.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              defaultValue={quiz.title}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Passing score (%) *</span>
            <input
              type="number"
              name="passingScore"
              required
              min="0"
              max="100"
              defaultValue={quiz.passingScore}
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <input type="hidden" name="questionsJson" id="questionsJsonInput" />

          <QuizEditor name="questionsJson" initial={initial} />

          <div className={styles.actions}>
            <Link href="/admin/quizzes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Danger zone */}
      <Card padding={6} style={{ marginTop: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            margin: "0 0 0.75rem 0",
            color: "var(--danger)",
          }}
        >
          Danger zone
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-500)", margin: "0 0 1rem 0" }}>
          Deleting a quiz is blocked if any QuizAttempt rows reference it. If delete is blocked, the
          page will show the attempt count; reassign or remove the attempts first.
        </p>
        <form action={handleDelete(quiz.id)}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--danger)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete quiz
          </button>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(quizId: string) {
  return async function (formData: FormData) {
    "use server";

    const courseId = String(formData.get("courseId") ?? "").trim() || (await loadCourseId(quizId));
    const title = String(formData.get("title") ?? "").trim();
    const passingScore = parseInt(String(formData.get("passingScore") ?? "-1"), 10);

    let questions: Array<{
      id: string;
      questionText: string;
      options: Array<{ id: string; optionText: string; isCorrect: boolean }>;
    }> = [];
    try {
      const raw = String(formData.get("questionsJson") ?? "[]");
      questions = JSON.parse(raw);
    } catch {
      redirect(`/admin/quizzes/${quizId}/edit?error=invalid_questions_json`);
      return;
    }

    const r = await updateQuizAction({
      id: quizId,
      courseId,
      title,
      passingScore,
      questions,
    });

    if (!r.ok) {
      redirect(`/admin/quizzes/${quizId}/edit?error=${r.error.kind}`);
      return;
    }

    redirect("/admin/quizzes");
  };
}

function handleDelete(quizId: string) {
  return async function () {
    "use server";
    const r = await deleteQuizAction({ quizId });
    if (!r.ok) {
      redirect(`/admin/quizzes/${quizId}/edit?error=${r.error.kind}`);
      return;
    }
    redirect("/admin/quizzes");
  };
}

async function loadCourseId(quizId: string): Promise<string> {
  // The edit form doesn't carry courseId in the form (it's displayed
  // read-only from the loaded quiz). The update use case still needs
  // it, so we re-load it from the repo.
  const container = buildContainer();
  const result = await container.quizRepo.findById(quizId);
  if (!result.ok || !result.value) {
    throw new Error("Quiz disappeared during update");
  }
  return result.value.courseId;
}

/**
 * /admin/quizzes/new — admin create quiz form.
 *
 * STORY-091 (US-006). Server component. The form posts to a server
 * action that calls createQuizAction.
 */
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { createQuizAction } from "@/app/actions/createQuiz.action";
import { QuizEditor, type EditorQuestion, type EditorOption } from "@/components/admin/QuizEditor";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_id: "Quiz ID is required.",
  invalid_course_id: "Course ID is required.",
  invalid_title: "Title is required.",
  invalid_passing_score: "Passing score must be between 0 and 100.",
  no_questions: "Add at least one question.",
  question_missing_correct_option: "Each question must have exactly one correct option.",
  question_multiple_correct_options: "Each question must have exactly one correct option.",
  db_error: "Database error. Try again.",
  unauthorized: "You must be an admin to create a quiz.",
};

export default async function NewQuizPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  // For the course dropdown, fetch all courses.
  const container = buildContainer();
  const coursesResult = await container.courseRepo.listAll();
  const courses = coursesResult.ok ? coursesResult.value : [];

  const initialQuestions: EditorQuestion[] = [
    {
      id: `q_${Date.now()}_1`,
      questionText: "",
      options: [
        { id: `o_${Date.now()}_1_1`, optionText: "", isCorrect: true },
        { id: `o_${Date.now()}_1_2`, optionText: "", isCorrect: false },
      ],
    },
  ];

  const errorMsg = sp.error ? (ERROR_MESSAGES[sp.error] ?? `Error: ${sp.error}`) : null;

  return (
    <div>
      <Link href="/admin/quizzes" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to quizzes
      </Link>

      <TopBar title="Add quiz" subtitle="Create a new quiz for a course" />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Quiz ID *</span>
            <input
              type="text"
              name="id"
              required
              maxLength={60}
              className={styles.input}
              placeholder="e.g. quiz-ppc-fundamentals"
            />
            <span className={styles.hint}>
              Stable identifier used in URLs. Cannot be changed later.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Course *</span>
            <select name="courseId" required defaultValue="" className={styles.input}>
              <option value="" disabled>
                — Select a course —
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              className={styles.input}
              placeholder="e.g. PPC Fundamentals Quiz"
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
              defaultValue="70"
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <input type="hidden" name="questionsJson" id="questionsJsonInput" />

          <QuizEditor name="questions" initial={initialQuestions} />

          <div className={styles.actions}>
            <Link href="/admin/quizzes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Create quiz
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim();
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
    redirect("/admin/quizzes/new?error=invalid_questions_json");
    return;
  }

  const r = await createQuizAction({ id, courseId, title, passingScore, questions });

  if (!r.ok) {
    redirect(`/admin/quizzes/new?error=${r.error.kind}`);
    return;
  }

  redirect("/admin/quizzes");
}

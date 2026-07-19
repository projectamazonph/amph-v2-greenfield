/**
 * /admin/live-classes/new — admin create live class form.
 *
 * STORY-050c. Server component.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createLiveClassAction } from "@/app/actions/createLiveClass.action";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";
import pageStyles from "../page.module.css";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewLiveClassPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error
    ? {
        invalid_title: "Title is required.",
        invalid_scheduled_at: "Scheduled date must be in the future.",
        invalid_duration: "Duration must be at least 1 minute.",
        invalid_meeting_url: "Please enter a valid URL.",
        id_conflict: "A live class with this ID already exists.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/live-classes" className={styles.backLink}>
        ← Back to live classes
      </Link>

      <TopBar
        title="Add live class"
        subtitle="Schedule a new live class session"
      />

      {errorMsg && (
        <Card padding="comfortable" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding="comfortable">
        <form action={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Course ID *</span>
            <input
              type="text"
              name="courseId"
              required
              maxLength={60}
              className={styles.input}
              placeholder="e.g. course_abc123"
            />
            <span className={styles.hint}>The course this live class belongs to.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              className={styles.input}
              placeholder="e.g. Advanced PPC Strategies — Q&A"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Scheduled at *</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              className={styles.input}
              style={{ width: "auto" }}
            />
            <span className={styles.hint}>Must be in the future.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Duration (minutes) *</span>
            <input
              type="number"
              name="durationMinutes"
              required
              min="1"
              max="480"
              defaultValue="60"
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Instructor ID *</span>
            <input
              type="text"
              name="instructorId"
              required
              maxLength={60}
              className={styles.input}
              placeholder="e.g. user_instructor_1"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Meeting URL *</span>
            <input
              type="url"
              name="meetingUrl"
              required
              maxLength={300}
              className={styles.input}
              placeholder="https://zoom.us/j/..."
            />
          </label>

          <div className={styles.actions}>
            <Link href="/admin/live-classes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Schedule live class
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const courseId = String(formData.get("courseId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const scheduledAtStr = String(formData.get("scheduledAt") ?? "").trim();
  const durationMinutes = parseInt(String(formData.get("durationMinutes") ?? "60"), 10);
  const instructorId = String(formData.get("instructorId") ?? "").trim();
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();

  if (!courseId || !title || !scheduledAtStr || !instructorId || !meetingUrl) {
    redirect("/admin/live-classes/new?error=missing");
  }

  const scheduledAt = new Date(scheduledAtStr);
  if (isNaN(scheduledAt.getTime())) {
    redirect("/admin/live-classes/new?error=invalid_scheduled_at");
  }

  const r = await createLiveClassAction({
    courseId,
    title,
    scheduledAt,
    durationMinutes,
    instructorId,
    meetingUrl,
  });

  if (!r.ok) {
    redirect(`/admin/live-classes/new?error=${r.error.kind}`);
    return;
  }

  redirect("/admin/live-classes");
}

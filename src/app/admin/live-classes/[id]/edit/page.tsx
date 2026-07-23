/**
 * /admin/live-classes/[id]/edit — admin edit live class form.
 *
 * STORY-050c. Server component.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { updateLiveClassAction } from "@/app/actions/updateLiveClass.action";
import { deleteLiveClassAction } from "@/app/actions/deleteLiveClass.action";
import type { LiveClassStatus } from "@/domain/entities/LiveClass";
import styles from "../../new/page.module.css";

const STATUSES: LiveClassStatus[] = ["scheduled", "cancelled", "completed"];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditLiveClassPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.adminGetLiveClass.execute(id);

  if (!result.ok) {
    notFound();
  }
  const lc = result.value;

  const errorMsg = sp.error
    ? {
        invalid_title: "Title is required.",
        invalid_scheduled_at: "Scheduled date must be in the future.",
        invalid_duration: "Duration must be at least 1 minute.",
        invalid_meeting_url: "Please enter a valid URL.",
        not_found: "Live class not found.",
      }[sp.error]
    : null;

  const defaultScheduledAt = lc.scheduledAt.toISOString().slice(0, 16);

  return (
    <div>
      <Link href="/admin/live-classes" className={styles.backLink}>
        ← Back to live classes
      </Link>

      <TopBar title={`Edit: ${lc.title}`} subtitle={lc.id} />

      {errorMsg && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleUpdate(id)} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Live Class ID</span>
            <input
              type="text"
              value={lc.id}
              disabled
              className={styles.input}
              style={{ opacity: 0.5 }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Course ID *</span>
            <input
              type="text"
              name="courseId"
              defaultValue={lc.courseId}
              disabled
              className={styles.input}
              style={{ opacity: 0.5 }}
            />
            <span className={styles.hint}>Course cannot be changed after creation.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Title *</span>
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              defaultValue={lc.title}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Scheduled at *</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              defaultValue={defaultScheduledAt}
              className={styles.input}
              style={{ width: "auto" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Duration (minutes) *</span>
            <input
              type="number"
              name="durationMinutes"
              required
              min="1"
              max="480"
              defaultValue={lc.durationMinutes}
              className={styles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Instructor ID *</span>
            <input
              type="text"
              name="instructorId"
              defaultValue={lc.instructorId}
              disabled
              className={styles.input}
              style={{ opacity: 0.5 }}
            />
            <span className={styles.hint}>Instructor cannot be changed after creation.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Meeting URL *</span>
            <input
              type="url"
              name="meetingUrl"
              required
              maxLength={300}
              defaultValue={lc.meetingUrl}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Status *</span>
            <select name="status" required defaultValue={lc.status} className={styles.input}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.actions}>
            <Link href="/admin/live-classes" className={styles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={styles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Archive section */}
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
          Cancelling a live class marks it as cancelled. Existing participants are unaffected.
        </p>
        <form action={handleDelete(id)}>
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
            Cancel live class
          </button>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(id: string) {
  return async function (formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const scheduledAtStr = String(formData.get("scheduledAt") ?? "").trim();
    const durationMinutes = parseInt(String(formData.get("durationMinutes") ?? "60"), 10);
    const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim() as LiveClassStatus;

    const scheduledAt = new Date(scheduledAtStr);
    if (isNaN(scheduledAt.getTime())) {
      redirect(`/admin/live-classes/${id}/edit?error=invalid_scheduled_at`);
    }

    const r = await updateLiveClassAction({
      id,
      patch: { title, scheduledAt, durationMinutes, meetingUrl, status },
    });

    if (!r.ok) {
      redirect(`/admin/live-classes/${id}/edit?error=${r.error.kind}`);
      return;
    }

    redirect("/admin/live-classes");
  };
}

function handleDelete(id: string) {
  return async function () {
    "use server";
    const r = await deleteLiveClassAction({ id });
    if (!r.ok) {
      redirect(`/admin/live-classes/${id}/edit?error=${r.error.kind}`);
      return;
    }
    redirect("/admin/live-classes");
  };
}

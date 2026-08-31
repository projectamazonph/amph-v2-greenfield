/**
 * /live-classes/[id] — student-facing live class detail.
 *
 * STORY-091. Server component. Shows class metadata + an RSVP / cancel
 * button that mutates the user's registration via the
 * `rsvpLiveClassAction` and `cancelLiveClassRsvpAction` server actions.
 *
 * Access control: only enrolled students see the RSVP button. The
 * `LiveClassRsvpButton` is still rendered for admins, with the action
 * themselves letting admins RSVP if their enrollment permits.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@astryxdesign/core";
import { Card } from "@astryxdesign/core";
import { StudentShell } from "@/components/student/StudentShell";
import { LiveClassRsvpButton } from "@/components/student/LiveClassRsvpButton";
import { LiveClassRecordingButton } from "@/components/student/LiveClassRecordingButton";
import buttonStyles from "@/components/ui/Button.module.css";
import { XPService } from "@/domain/services/XPService";
import { ArrowLeft, CalendarBlank, Clock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const container = buildContainer();
  const r = await container.liveClassRepo.findById(id);
  if (!r.ok || !r.value) {
    return { title: "Class not found" };
  }
  return {
    title: `${r.value.title} | Live class | Project Amazon PH Academy`,
    description: `${r.value.durationMinutes} minute live class on ${r.value.scheduledAt.toLocaleString("en-US", { dateStyle: "long" })}.`,
  };
}

export default async function LiveClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const container = buildContainer();

  // ── Class metadata ───────────────────────────────────────────
  const classResult = await container.liveClassRepo.findById(id);
  if (!classResult.ok) {
    return (
      <StudentShell user={user}>
        <main id="main-content">
          <p>Failed to load class. Please try again.</p>
        </main>
      </StudentShell>
    );
  }
  if (!classResult.value) {
    notFound();
  }
  const liveClass = classResult.value;

  // ── Enrollment check (for the RSVP gate) ────────────────────
  const enrollments = await container.enrollmentRepo.findByUserId(user.id);
  const isEnrolled = enrollments.ok
    ? enrollments.value.some(
        (enrollment) =>
          enrollment.courseId === liveClass.courseId && enrollment.status === "active",
      )
    : false;

  // ── Current RSVP for the user ────────────────────────────────
  const rsvpResult = await container.liveClassRegistrationRepo.findByUserAndClass(
    user.id,
    liveClass.id,
  );
  const rsvp = rsvpResult.ok ? rsvpResult.value : null;
  const isRegistered = rsvp?.status === "registered";
  const hasRsvpd = rsvp !== null && rsvp.status !== "cancelled";
  const hasWatchedRecording =
    rsvp?.watchedRecordingAt !== null && rsvp?.watchedRecordingAt !== undefined;

  const isCancelled = liveClass.status === "cancelled";
  const isCompleted = liveClass.status === "completed";

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1}>
        <div className={styles.breadcrumb}>
          <Link href="/live-classes" className={styles.breadcrumbLink}>
            <ArrowLeft size={16} aria-hidden /> All live classes
          </Link>
        </div>

        <Card padding={6}>
          <header className={styles.header}>
            <div className={styles.statusRow}>
              {isCancelled ? (
                <Badge variant="neutral" label="Cancelled" />
              ) : isCompleted ? (
                <Badge variant="neutral" label="Completed" />
              ) : (
                <Badge variant="success" label="Scheduled" />
              )}
              {isRegistered && <Badge variant="success" label="You are RSVPd" />}
            </div>
            <span className={styles.eyebrow}>Live session</span>
            <h1 className={styles.title}>{liveClass.title}</h1>
            <p className={styles.intro}>
              {isCompleted
                ? "Review the recording and capture the operating decisions that matter to your work."
                : isCancelled
                  ? "This session is no longer available for attendance."
                  : "Reserve your place, join from this page, and return here when the session is complete."}
            </p>
          </header>

          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>When</dt>
              <dd className={styles.metaValue}>
                <time dateTime={liveClass.scheduledAt.toISOString()}>
                  <CalendarBlank size={16} weight="bold" aria-hidden="true" />
                  {liveClass.scheduledAt.toLocaleString("en-US", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Duration</dt>
              <dd className={styles.metaValue}>
                <span>
                  <Clock size={16} weight="bold" aria-hidden="true" />
                  {liveClass.durationMinutes} minutes
                </span>
              </dd>
            </div>
          </dl>

          {!isCancelled && (
            <section className={styles.nextStep} aria-labelledby="live-class-next-step">
              <span className={styles.eyebrow}>
                {isCompleted ? "After the session" : "Next step"}
              </span>
              <h2 id="live-class-next-step" className={styles.nextStepTitle}>
                {isCompleted
                  ? "Turn the recording into a takeaway"
                  : isEnrolled
                    ? "Reserve your place"
                    : "Unlock this session"}
              </h2>
              <p className={styles.nextStepText}>
                {isCompleted
                  ? "Watch the recording, mark it as watched, and capture one operating decision you can apply next."
                  : isEnrolled
                    ? "RSVP now so the session is easy to find when it starts. Your meeting link appears after you register."
                    : "Enroll in the associated course to RSVP and access the meeting link for this session."}
              </p>
            </section>
          )}

          {!isEnrolled && !isCancelled ? (
            <div className={styles.notice}>
              <div>
                <span className={styles.noticeKicker}>Access required</span>
                <p className={styles.noticeText}>
                  You must be enrolled in the course to RSVP for this live class.
                </p>
              </div>
              <Link
                href="/courses"
                className={[
                  buttonStyles.btn,
                  buttonStyles.secondary,
                  buttonStyles.md,
                  styles.noticeLink,
                ].join(" ")}
              >
                Browse courses
              </Link>
            </div>
          ) : isCancelled ? (
            <p className={styles.noticeText}>This class was cancelled. RSVP is not available.</p>
          ) : isCompleted ? (
            liveClass.recordingUrl && hasRsvpd ? (
              <LiveClassRecordingButton
                liveClassId={liveClass.id}
                recordingUrl={liveClass.recordingUrl}
                alreadyWatched={hasWatchedRecording}
                xpAmount={XPService.LIVE_CLASS_ATTENDED_XP}
              />
            ) : liveClass.recordingUrl ? (
              <p className={styles.noticeText}>
                This class has ended. You must have RSVPd to watch the recording.
              </p>
            ) : (
              <p className={styles.noticeText}>
                This class has ended. The recording has not been posted yet.
              </p>
            )
          ) : (
            <div className={styles.actions}>
              <LiveClassRsvpButton liveClassId={liveClass.id} isRegistered={isRegistered} />
              {isRegistered && (
                <a
                  href={liveClass.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={[
                    buttonStyles.btn,
                    buttonStyles.ghost,
                    buttonStyles.md,
                    styles.meetingLink,
                  ].join(" ")}
                >
                  Open meeting link
                </a>
              )}
            </div>
          )}
        </Card>
      </main>
    </StudentShell>
  );
}

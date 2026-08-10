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
import { Button } from "@/components/ui/Button";
import { XPService } from "@/domain/services/XPService";
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
    title: `${r.value.title} — Live class — Project Amazon PH Academy`,
    description: `${r.value.durationMinutes} minute live class on ${r.value.scheduledAt.toLocaleString("en-US", { dateStyle: "long" })}.`,
  };
}

export default async function LiveClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const container = buildContainer();

  // ── Class metadata ───────────────────────────────────────────
  const classResult = await container.liveClassRepo.findById(id);
  if (!classResult.ok || !classResult.value) {
    notFound();
  }
  const liveClass = classResult.value;

  // ── Enrollment check (for the RSVP gate) ────────────────────
  const enrollments = await container.enrollmentRepo.findByUserId(user.id);
  const isEnrolled = enrollments.ok
    ? enrollments.value.some((e) => e.courseId === liveClass.courseId && e.status === "active")
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
      <main>
        <div className={styles.breadcrumb}>
          <Link href="/live-classes" className={styles.breadcrumbLink}>
            ← All live classes
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
            <h1 className={styles.title}>{liveClass.title}</h1>
          </header>

          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>When</dt>
              <dd className={styles.metaValue}>
                {liveClass.scheduledAt.toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Duration</dt>
              <dd className={styles.metaValue}>{liveClass.durationMinutes} minutes</dd>
            </div>
          </dl>

          {!isEnrolled && !isCancelled ? (
            <div className={styles.notice}>
              <p className={styles.noticeText}>
                You must be enrolled in the course to RSVP for this live class.
              </p>
              <Link href={`/courses`} className={styles.noticeLink}>
                <Button variant="secondary" size="md">
                  Browse courses
                </Button>
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
                  className={styles.meetingLink}
                >
                  <Button variant="ghost" size="md">
                    Open meeting link
                  </Button>
                </a>
              )}
            </div>
          )}
        </Card>
      </main>
    </StudentShell>
  );
}

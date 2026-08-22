/**
 * /live-classes — student-facing list page.
 *
 * STORY-090. Server component. Reads from the
 * `listLiveClassesForStudent` use case which joins live classes with
 * the student's enrollments and current RSVPs.
 */

import Link from "next/link";
import { ArrowRight, CalendarBlank, Clock } from "@phosphor-icons/react/dist/ssr";
import buttonStyles from "@/components/ui/Button.module.css";
import { StudentShell } from "@/components/student/StudentShell";
import { Badge, Card } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function LiveClassesPage() {
  const user = await requireAuth();
  const container = buildContainer();
  const result = await container.listLiveClassesForStudent.execute({
    userId: user.id,
  });
  const nextSession = result.ok && result.value.length > 0 ? result.value[0] : null;

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>Learn live</span>
            <h1 className={styles.title}>Live classes</h1>
            <p className={styles.subtitle}>
              Upcoming scheduled sessions for your enrolled courses.
            </p>
          </div>
          <div className={styles.headerSummary}>
            <CalendarBlank size={18} weight="bold" aria-hidden="true" />
            <span>All times shown in UTC</span>
          </div>
        </header>

        {!result.ok ? (
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty} role="alert">
                We couldn&apos;t load live classes right now. Your enrollment and RSVP status are
                unchanged. Refresh to try again.
              </p>
              <Link href="/dashboard" className={styles.stateLink}>
                Return to dashboard
              </Link>
            </div>
          </Card>
        ) : !nextSession ? (
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty}>
                No upcoming live classes. New sessions are scheduled by the instructors and will
                appear here.
              </p>
              <Link href="/courses" className={styles.stateLink}>
                Browse courses
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <section className={styles.nextSession} aria-labelledby="next-session-title">
              <div className={styles.nextSessionCopy}>
                <span className={styles.nextSessionKicker}>Next session</span>
                <h2 id="next-session-title" className={styles.nextSessionTitle}>
                  {nextSession.liveClass.title}
                </h2>
                <p className={styles.nextSessionMeta}>
                  <time dateTime={nextSession.liveClass.scheduledAt.toISOString()}>
                    {formatSessionDate(nextSession.liveClass.scheduledAt)}
                  </time>{" "}
                  · {nextSession.liveClass.durationMinutes} minutes
                </p>
              </div>
              <Link
                href={`/live-classes/${nextSession.liveClass.id}`}
                className={styles.nextSessionLink}
              >
                View next session <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </section>

            <div className={styles.listHeading}>
              <h2 className={styles.listTitle}>All upcoming sessions</h2>
              <span className={styles.listCount}>{result.value.length} scheduled</span>
            </div>

            <ul className={styles.list} aria-label="Upcoming live classes">
              {result.value.map(({ liveClass, registration }) => (
                <li key={liveClass.id} className={styles.row}>
                  <div className={styles.cellDate}>
                    <time dateTime={liveClass.scheduledAt.toISOString()} className={styles.date}>
                      {liveClass.scheduledAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    <span className={styles.time}>
                      <Clock size={13} weight="bold" aria-hidden="true" />
                      {liveClass.scheduledAt.toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </span>
                  </div>
                  <div className={styles.cellBody}>
                    <h2 className={styles.classTitle}>{liveClass.title}</h2>
                    <p className={styles.duration}>{liveClass.durationMinutes} minutes</p>
                  </div>
                  <div className={styles.cellStatus}>
                    {registration && registration.status === "registered" ? (
                      <Badge variant="success" label="RSVPd" />
                    ) : registration && registration.status === "cancelled" ? (
                      <Badge variant="neutral" label="Cancelled RSVP" />
                    ) : (
                      <Badge variant="neutral" label="No RSVP" />
                    )}
                  </div>
                  <div className={styles.cellAction}>
                    <Link
                      href={`/live-classes/${liveClass.id}`}
                      className={[buttonStyles.btn, buttonStyles.secondary, buttonStyles.md].join(
                        " ",
                      )}
                      aria-label={`View session: ${liveClass.title}`}
                    >
                      View session
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </StudentShell>
  );
}

function formatSessionDate(date: Date): string {
  return (
    date.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

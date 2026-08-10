/**
 * /live-classes — student-facing list page.
 *
 * STORY-090. Server component. Reads from the
 * `listLiveClassesForStudent` use case which joins live classes with
 * the student's enrollments and current RSVPs.
 */

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@astryxdesign/core";
import { Badge } from "@astryxdesign/core";
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

  return (
    <StudentShell user={user}>
      <main>
        <div className={styles.header}>
          <h1 className={styles.title}>Live classes</h1>
          <p className={styles.subtitle}>Upcoming scheduled sessions for your enrolled courses.</p>
        </div>

        {!result.ok ? (
          <Card padding={6}>
            <p className={styles.empty} role="alert">
              Live classes could not be loaded. Please try again.
            </p>
          </Card>
        ) : result.value.length === 0 ? (
          <Card padding={6}>
            <p className={styles.empty}>
              No upcoming live classes. New sessions are scheduled by the instructors and will
              appear here.
            </p>
          </Card>
        ) : (
          <ul className={styles.list} aria-label="Upcoming live classes">
            {result.value.map(({ liveClass, registration }) => (
              <li key={liveClass.id} className={styles.row}>
                <div className={styles.cellDate}>
                  <span className={styles.date}>
                    {liveClass.scheduledAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className={styles.time}>
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
                  <Link href={`/live-classes/${liveClass.id}`}>
                    <Button variant="secondary" size="md">
                      View
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </StudentShell>
  );
}

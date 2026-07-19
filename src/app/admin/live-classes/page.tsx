/**
 * /admin/live-classes — admin live class list.
 *
 * STORY-050c. Server component.
 */
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function LiveClassesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const container = buildContainer();
  const r = await container.adminListLiveClasses.execute({
    courseId: sp.courseId,
  });

  const liveClasses = r.ok ? r.value : [];

  return (
    <div>
      <TopBar
        title="Live classes"
        subtitle="Schedule and manage live class sessions"
        actions={
          <Link href="/admin/live-classes/new" className={styles.addButton}>
            + Add live class
          </Link>
        }
      />

      <Card padding="comfortable">
        {liveClasses.length === 0 ? (
          <p className={styles.empty}>No live classes scheduled yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Scheduled</th>
                <th>Duration</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liveClasses.map((lc) => (
                <tr key={lc.id}>
                  <td className={styles.title}>{lc.title}</td>
                  <td className={styles.course}>{lc.courseId}</td>
                  <td className={styles.date}>
                    {lc.scheduledAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td>{lc.durationMinutes}m</td>
                  <td>
                    <span className={`${styles.badge} ${styles[lc.status]}`}>
                      {lc.status}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <Link
                      href={`/admin/live-classes/${lc.id}/edit`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

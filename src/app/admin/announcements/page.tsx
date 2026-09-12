/**
 * /admin/announcements — admin list of all banners.
 *
 * P1-07 (P4 PR-A). Server component. Shows every non-deleted
 * announcement with edit links and an inline active/inactive toggle.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { announcementIsVisibleAt } from "@/domain/entities/Announcement";
import { setAnnouncementActiveAction } from "@/app/actions/adminAnnouncements.action";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const container = buildContainer();
  const result = await container.announcementRepo.listAll();
  const announcements = result.ok ? result.value : [];
  const now = container.clock.now();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Announcements</h1>
          <p className={styles.subtitle}>
            Site-wide banners shown at the top of every page.
          </p>
        </div>
        <Link href="/admin/announcements/new" className={styles.newButton}>
          + New announcement
        </Link>
      </header>

      <Card>
        {announcements.length === 0 ? (
          <p className={styles.empty}>
            No announcements yet. Create the first one to display a banner.
          </p>
        ) : (
          <div className="table-scroll">
            <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Level</th>
                <th>State</th>
                <th>Window</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => {
                const visible = announcementIsVisibleAt(a, now);
                return (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/admin/announcements/${a.id}/edit`}
                        className={styles.titleLink}
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[`level_${a.level}`]}`}>
                        {a.level}
                      </span>
                    </td>
                    <td>
                      <ActiveToggle announcementId={a.id} isActive={a.isActive} />
                    </td>
                    <td className={styles.window}>
                      {visible ? (
                        <span className={styles.liveDot} aria-hidden />
                      ) : null}
                      {formatWindow(a.startsAt, a.endsAt)}
                    </td>
                    <td>
                      <Link href={`/admin/announcements/${a.id}/edit`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

function ActiveToggle({
  announcementId,
  isActive,
}: {
  announcementId: string;
  isActive: boolean;
}) {
  async function toggle() {
    "use server";
    await setAnnouncementActiveAction({
      id: announcementId,
      active: !isActive,
    });
  }
  return (
    <form action={toggle}>
      <button
        type="submit"
        className={`${styles.toggle} ${isActive ? styles.toggleOn : styles.toggleOff}`}
        aria-label={isActive ? "Deactivate" : "Activate"}
      >
        {isActive ? "Active" : "Inactive"}
      </button>
    </form>
  );
}

function formatWindow(startsAt: Date | null, endsAt: Date | null): string {
  if (startsAt === null && endsAt === null) return "Always";
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (startsAt && endsAt) return `${fmt(startsAt)} → ${fmt(endsAt)}`;
  if (startsAt) return `From ${fmt(startsAt)}`;
  return `Until ${fmt(endsAt!)}`;
}

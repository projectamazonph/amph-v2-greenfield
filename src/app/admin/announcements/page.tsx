/**
 * /admin/announcements - Site-wide announcement management.
 * P1-07: Site-wide announcement banner.
 */

import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/astryxdesign/core";
import { buildContainer } from "@/composition/container";
import styles from "./page.module.css";

export default async function AnnouncementsPage() {
  const admin = await requireAdmin();
  const { announcementRepo } = buildContainer();
  const listResult = await announcementRepo.listAll();
  const announcements = listResult.ok ? listResult.value : [];

  return (
    <div>
      <TopBar title="Announcements" subtitle="Manage site-wide announcement banners" />
      
      <Card padding={6} className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Site-Wide Announcements</h2>
          <Link href="/admin/announcements/new" className={styles.createButton}>
            + Create Announcement
          </Link>
        </div>

        <p className={styles.description}>
          Active announcements will be displayed as a banner at the top of every page.
          Users can dismiss announcements, but they will reappear on new sessions.
        </p>

        {announcements.length === 0 ? (
          <p className={styles.empty}>No announcements yet. Create one to get started.</p>
        ) : (
          <div className={styles.list}>
            {announcements.map((announcement) => (
              <Card key={announcement.id} padding={4} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{announcement.title}</span>
                  <span className={announcement.isActive ? styles.itemStatusActive : styles.itemStatusInactive}>
                    {announcement.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className={styles.itemContent}>{announcement.content}</p>
                <div className={styles.itemMeta}>
                  <span className={styles[`itemSeverity${announcement.severity}`]}>
                    {announcement.severity}
                  </span>
                  <span className={styles.itemCreated}>
                    Created: {announcement.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

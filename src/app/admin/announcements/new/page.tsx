/**
 * /admin/announcements/new - Create new announcement.
 * P1-07: Site-wide announcement banner.
 */

import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { createAnnouncementAction } from "@/app/actions/LMS";
import styles from "./page.module.css";

export default async function NewAnnouncementPage() {
  await requireAdmin();

  return (
    <div>
      <TopBar title="Create Announcement" subtitle="Add a new site-wide announcement" />
      
      <Card padding={6} className={styles.card}>
        <h2 className={styles.title}>Create Announcement</h2>
        <p className={styles.description}>
          Create a new announcement that will be displayed as a banner at the top of every page.
        </p>

        <form action={createAnnouncementAction} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className={styles.input}
              placeholder="Brief announcement title"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="content" className={styles.label}>
              Content
            </label>
            <textarea
              id="content"
              name="content"
              className={styles.textarea}
              placeholder="Announcement message to display"
              rows={5}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="severity" className={styles.label}>
              Severity
            </label>
            <select id="severity" name="severity" className={styles.select} defaultValue="info">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="isActive" defaultChecked className={styles.checkbox} />
              <span>Activate immediately</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton}>
              Create Announcement
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

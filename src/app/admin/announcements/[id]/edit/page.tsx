/**
 * /admin/announcements/[id]/edit - Edit announcement.
 * P1-07: Site-wide announcement banner.
 */

import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { updateAnnouncementAction } from "@/app/actions/LMS";
import styles from "./page.module.css";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { announcementRepo } = buildContainer();
  
  const getResult = await announcementRepo.getById(id);
  if (!getResult.ok || !getResult.value) {
    notFound();
  }

  const announcement = getResult.value;

  return (
    <div>
      <TopBar title="Edit Announcement" subtitle={`Editing: ${announcement.title}`} />
      
      <Card padding={6} className={styles.card}>
        <h2 className={styles.title}>Edit Announcement</h2>
        <p className={styles.description}>
          Update the announcement details below.
        </p>

        <form action={updateAnnouncementAction} className={styles.form}>
          <input type="hidden" name="id" value={announcement.id} />

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className={styles.input}
              defaultValue={announcement.title}
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
              defaultValue={announcement.content}
              rows={5}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="severity" className={styles.label}>
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              className={styles.select}
              defaultValue={announcement.severity}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={announcement.isActive}
                className={styles.checkbox}
              />
              <span>Active</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton}>
              Update Announcement
            </button>
            <button type="button" className={styles.cancelButton} onClick={() => redirect("/admin/announcements")}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

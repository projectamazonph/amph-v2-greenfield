/**
 * /admin/badges — admin badge list.
 *
 * STORY-050e. Server component.
 */
import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default async function BadgesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListBadges.execute();
  const badges = r.ok ? r.value : [];

  return (
    <div>
      <TopBar
        title="Badges"
        subtitle="Manage badge templates (XP rewards + criteria templates)"
        actions={
          <Link href="/admin/badges/new" className={styles.addButton}>
            + Add badge
          </Link>
        }
      />

      <Card padding="comfortable">
        {badges.length === 0 ? (
          <p className={styles.empty}>No badges yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th>Description</th>
                <th>Icon</th>
                <th>XP</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {badges.map((b) => (
                <tr key={b.slug}>
                  <td className={styles.slug}>{b.slug}</td>
                  <td className={styles.name}>{b.name}</td>
                  <td className={styles.description}>{b.description}</td>
                  <td className={styles.icon}>{b.iconName}</td>
                  <td className={styles.xp}>+{b.xpReward}</td>
                  <td>
                    {b.archived ? (
                      <span className={`${styles.statusBadge} ${styles.archived}`}>Archived</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.active}`}>Active</span>
                    )}
                  </td>
                  <td className={styles.actions}>
                    <Link
                      href={`/admin/badges/${b.slug}/edit`}
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

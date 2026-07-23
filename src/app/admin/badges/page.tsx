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
import type { Badge as DomainBadge } from "@/domain/entities/Badge";
import { AdminBadgesTable, type BadgeRow } from "@/components/astryx/AdminBadgesTable";
import styles from "./page.module.css";

export default async function BadgesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListBadges.execute();
  const badges = r.ok ? r.value : [];

  // Map domain Badge[] → BadgeRow[] (plain serializable data for client component)
  const rows: BadgeRow[] = badges.map((b) => ({
    slug: b.slug,
    name: b.name,
    description: b.description,
    iconName: b.iconName,
    xpReward: b.xpReward,
    archived: b.archived,
  }));

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

      {/* Table — client component handles renderCell (function props) */}
      <Card padding="comfortable">
        <AdminBadgesTable badges={rows} />
      </Card>
    </div>
  );
}

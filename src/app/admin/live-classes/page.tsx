/**
 * /admin/live-classes — admin live class list.
 *
 * STORY-050c. Server component.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import type { LiveClassStatus } from "@/domain/entities/LiveClass";
import {
  AdminLiveClassesTable,
  type LiveClassRow,
} from "@/components/astryx/AdminLiveClassesTable";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function LiveClassesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;

  const container = buildContainer();
  const r = await container.adminListLiveClasses.execute({ courseId: sp.courseId });
  const liveClasses = r.ok ? r.value : [];

  // Map domain LiveClass[] → LiveClassRow[]
  const rows: LiveClassRow[] = liveClasses.map((lc) => ({
    id: lc.id,
    title: lc.title,
    courseId: lc.courseId,
    scheduledAt: lc.scheduledAt,
    durationMinutes: lc.durationMinutes,
    status: lc.status as LiveClassStatus,
  }));

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

      <Card padding={6}>
        <AdminLiveClassesTable liveClasses={rows} />
      </Card>
    </div>
  );
}

/**
 * /admin/resources — admin download-center resource list.
 *
 * STORY-098. Server component.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { AdminResourcesTable, type ResourceRow } from "@/components/astryx/AdminResourcesTable";
import styles from "./page.module.css";

export default async function ResourcesPage() {
  await requireAdmin();

  const container = buildContainer();
  const r = await container.adminListResources.execute();
  const resources = r.ok ? r.value : [];

  const rows: ResourceRow[] = resources.map((resource) => ({
    id: resource.id,
    title: resource.title,
    category: resource.category,
    fileType: resource.fileType,
    accessTier: resource.accessTier,
    isPublished: resource.isPublished,
    downloadCount: resource.downloadCount,
  }));

  return (
    <div>
      <TopBar
        title="Download center"
        subtitle="Guides, templates, automation tools, and other downloadable resources"
        actions={
          <Link href="/admin/resources/new" className={styles.addButton}>
            + Add resource
          </Link>
        }
      />

      <Card padding={6}>
        <AdminResourcesTable resources={rows} />
      </Card>
    </div>
  );
}

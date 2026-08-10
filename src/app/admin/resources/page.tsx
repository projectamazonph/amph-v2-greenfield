/**
 * /admin/resources — admin download-center resource list.
 *
 * STORY-098. Server component. Search/filter/pagination added in review,
 * mirroring `/admin/users` (design spec §10 — "every list page must
 * provide search, filtering, and pagination").
 *
 * SOLID: thin page. All business logic is in `AdminListResources` (the
 * use case).
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import type { ResourceCategory } from "@/domain/entities/Resource";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";
import { AdminResourcesTable, type ResourceRow } from "@/components/astryx/AdminResourcesTable";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    tier?: string;
    page?: string;
  }>;
}

const VALID_CATEGORIES: readonly ResourceCategory[] = [
  "guide",
  "template",
  "automation_tool",
  "cheat_sheet",
  "handout",
];

function parseCategory(v: string | undefined): ResourceCategory | undefined {
  return v && (VALID_CATEGORIES as readonly string[]).includes(v)
    ? (v as ResourceCategory)
    : undefined;
}

function parseTier(v: string | undefined): CourseAccessTier | undefined {
  if (v === "PREVIEW" || v === "STARTER" || v === "PRO") return v;
  return undefined;
}

function parsePage(v: string | undefined): number {
  if (!v) return 1;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const category = parseCategory(params.category);
  const tier = parseTier(params.tier);
  const page = parsePage(params.page);

  const container = buildContainer();
  const result = await container.adminListResources.execute({
    search,
    category,
    accessTier: tier,
    page,
    pageSize: 25,
  });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Download center" subtitle="Guides, templates, and other downloadables" />
        <Card padding={6}>
          <p className={styles.error}>
            Resources could not be loaded. The database may still be updating; try again shortly.
          </p>
        </Card>
      </div>
    );
  }

  const { resources, totalCount, pageSize } = result.value;

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
        subtitle={`${totalCount} total — guides, templates, automation tools, and other downloadable resources`}
        actions={
          <Link href="/admin/resources/new" className={styles.addButton}>
            + Add resource
          </Link>
        }
      />

      {/* Filter form — GET submission updates URL params; server re-renders */}
      <form className={styles.filters} method="get">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search title or description"
          className={styles.searchInput}
        />
        <select name="category" defaultValue={category ?? ""} className={styles.select}>
          <option value="">All categories</option>
          <option value="guide">Guide</option>
          <option value="template">Template</option>
          <option value="automation_tool">Automation tool</option>
          <option value="cheat_sheet">Cheat sheet</option>
          <option value="handout">Handout</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} className={styles.select}>
          <option value="">All tiers</option>
          <option value="PREVIEW">Preview</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
        </select>
        <button type="submit" className={styles.filterButton}>
          Apply
        </button>
      </form>

      <Card padding={6}>
        <AdminResourcesTable
          resources={rows}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          filters={{ search, category, tier }}
        />
      </Card>
    </div>
  );
}

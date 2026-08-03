/**
 * /resources — the download center. Student-facing list page.
 *
 * STORY-098. Server component. Guides, templates, automation tools
 * (e.g. the STR winner/bleeder scanner sheet), client reporting
 * templates, monitoring sheets, audit templates, student handouts,
 * cheat sheets, and quick guides, grouped by category. Resources are
 * gated by `accessTier` the same way courses are: a resource above
 * the student's subscription tier still shows (so they know what
 * upgrading unlocks) but renders "Upgrade to unlock" instead of a
 * download link. The download route itself (`/api/resources/[id]/download`)
 * re-checks access server-side — this page's lock icon is a UX hint,
 * not the enforcement point.
 */

import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import { Card, Badge } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import type { ResourceCategory } from "@/domain/entities/Resource";
import type { ResourceWithAccess } from "@/usecases/ListAvailableResources";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: ResourceCategory[] = [
  "guide",
  "template",
  "automation_tool",
  "cheat_sheet",
  "handout",
];

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  guide: "Guides",
  template: "Templates",
  automation_tool: "Automation tools",
  cheat_sheet: "Cheat sheets",
  handout: "Student handouts",
};

export default async function ResourcesPage() {
  const user = await requireAuth();
  const container = buildContainer();
  const result = await container.listAvailableResources.execute({
    subscriptionTier: user.subscriptionTier,
  });

  if (!result.ok) {
    return (
      <StudentShell user={user}>
        <div className={styles.header}>
          <h1 className={styles.title}>Download center</h1>
        </div>
        <Card padding={6}>
          <p className={styles.empty}>
            Something went wrong loading the download center. Please try again.
          </p>
        </Card>
      </StudentShell>
    );
  }

  const items = result.value;

  const byCategory = new Map<ResourceCategory, ResourceWithAccess[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.resource.category) ?? [];
    bucket.push(item);
    byCategory.set(item.resource.category, bucket);
  }

  return (
    <StudentShell user={user}>
      <div className={styles.header}>
        <h1 className={styles.title}>Download center</h1>
        <p className={styles.subtitle}>
          Guides, templates, automation tools, and handouts you can use on the job.
        </p>
      </div>

      {items.length === 0 ? (
        <Card padding={6}>
          <p className={styles.empty}>No resources are published yet. Check back soon.</p>
        </Card>
      ) : (
        CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => (
          <section key={category} className={styles.section} aria-label={CATEGORY_LABELS[category]}>
            <h2 className={styles.sectionTitle}>{CATEGORY_LABELS[category]}</h2>
            <ul className={styles.list}>
              {byCategory.get(category)!.map(({ resource, locked }) => (
                <li key={resource.id} className={styles.row}>
                  <div className={styles.cellBody}>
                    <h3 className={styles.resourceTitle}>{resource.title}</h3>
                    <p className={styles.resourceDescription}>{resource.description}</p>
                  </div>
                  <div className={styles.cellMeta}>
                    <span className={styles.fileType}>{resource.fileType}</span>
                    {locked && <Badge variant="neutral" label={`${resource.accessTier} only`} />}
                  </div>
                  <div className={styles.cellAction}>
                    {locked ? (
                      <Link href="/pricing" className={styles.upgradeLink}>
                        Upgrade to unlock
                      </Link>
                    ) : (
                      <a
                        href={`/api/resources/${resource.id}/download`}
                        className={styles.downloadLink}
                      >
                        Download
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </StudentShell>
  );
}

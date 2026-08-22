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
import { ArrowUpRight, DownloadSimple, FileText, LockKey } from "@phosphor-icons/react/dist/ssr";
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
        <main id="main-content" tabIndex={-1}>
          <header className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Student resources</span>
              <h1 className={styles.title}>Download center</h1>
            </div>
          </header>
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty} role="alert">
                We couldn&apos;t load your download center right now. Your access and files are
                unchanged. Refresh to try again.
              </p>
              <Link href="/dashboard" className={styles.stateLink}>
                Return to dashboard
              </Link>
            </div>
          </Card>
        </main>
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
        <main id="main-content" tabIndex={-1}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>Student resources</span>
            <h1 className={styles.title}>Download center</h1>
            <p className={styles.subtitle}>
              Guides, templates, automation tools, and handouts you can use on the job.
            </p>
          </div>
          <div className={styles.headerSummary} aria-label={`${items.length} resources available`}>
            <strong>{items.length}</strong>
            <span>resources available</span>
          </div>
        </header>

        {items.length === 0 ? (
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty}>No resources are published yet. Check back soon.</p>
              <Link href="/courses" className={styles.stateLink}>
                Continue learning
              </Link>
            </div>
          </Card>
        ) : (
          CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => (
            <section
              key={category}
              className={styles.section}
              aria-labelledby={`${category}-heading`}
            >
              <div className={styles.sectionHeading}>
                <h2 id={`${category}-heading`} className={styles.sectionTitle}>
                  {CATEGORY_LABELS[category]}
                </h2>
                <span className={styles.sectionCount}>
                  {byCategory.get(category)!.length} {byCategory.get(category)!.length === 1 ? "item" : "items"}
                </span>
              </div>
              <ul className={styles.list}>
                {byCategory.get(category)!.map(({ resource, locked }) => (
                  <li key={resource.id} className={styles.row}>
                    <div className={styles.resourceIcon} aria-hidden="true">
                      {locked ? <LockKey size={20} weight="bold" /> : <FileText size={20} weight="bold" />}
                    </div>
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
                          Upgrade <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                        </Link>
                      ) : (
                        <a
                          href={`/api/resources/${resource.id}/download`}
                          className={styles.downloadLink}
                        >
                          Download <DownloadSimple size={14} weight="bold" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </StudentShell>
  );
}

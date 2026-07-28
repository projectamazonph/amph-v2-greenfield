/**
 * /admin/content — Content management hub.
 *
 * STORY-046. Server component.
 *
 * Story 019 (composio) and Sprint 14 (curriculum content) are the
 * real content surfaces; this page is a placeholder hub that:
 *  - Documents where content actually lives in the app
 *  - Surfaces the "Import amph content" admin action once Sprint 11
 *    ships the admin-gated form for it
 *  - Shows existing content counts read from the repo so the page
 *    is useful even today
 *
 * Sprint 11+ will replace this with a full CMS.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import styles from "./page.module.css";

const numberFormat = new Intl.NumberFormat("en-US");

export default async function AdminContentPage() {
  const user = await requireAdmin();
  const container = buildContainer();

  // Best-effort course count. If the DB or repo isn't reachable the
  // page still renders with zero — the hub is informational.
  const coursesResult = await container.courseRepo.listAll();
  const courseCount = coursesResult.ok ? coursesResult.value.length : 0;

  return (
    <div>
      <TopBar title="Content" subtitle="Curriculum modules, lessons, and MDX posts" />

      <section className={styles.statGrid} aria-label="Content counts">
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Courses</div>
          <div className={styles.countValue}>{numberFormat.format(courseCount)}</div>
          <Link href="/admin/courses" className={styles.countLink}>
            Manage →
          </Link>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Modules</div>
          <div className={styles.countValue}>—</div>
          <span className={styles.countHint}>counted per course</span>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Lessons</div>
          <div className={styles.countValue}>—</div>
          <span className={styles.countHint}>counted per module</span>
        </div>
      </section>

      <Card padding={6} className={styles.importCard}>
        <h2 className={styles.sectionTitle}>Import AMPH content</h2>
        <p className={styles.help}>
          Bulk-import the curriculum from <code>content/curriculum/</code> (MDX + JSON). The CLI is{" "}
          <code>pnpm import:content</code>. The web-based importer UI lands in Sprint 11+; until
          then, run the script from a machine with write access to the DB.
        </p>
      </Card>

      <Card padding={6} className={styles.comingCard}>
        <h2 className={styles.sectionTitle}>What lives here</h2>
        <ul className={styles.list}>
          <li>
            <strong>Course catalog</strong> — managed under{" "}
            <Link href="/admin/courses">Courses</Link>. Each course owns modules and lessons.
          </li>
          <li>
            <strong>Lesson body</strong> — stored as MDX in{" "}
            <code>content/curriculum/modules/&lt;slug&gt;/</code>. The Next.js MDX renderer (
            <code>NextMdxRenderer</code>) reads from the filesystem at request time.
          </li>
          <li>
            <strong>Quizzes</strong> — managed under <Link href="/admin/quizzes">Quizzes</Link>.
            Questions and options live in the <code>quizzes</code>, <code>quiz_questions</code>, and{" "}
            <code>quiz_options</code> tables.
          </li>
          <li>
            <strong>Simulator scenarios</strong> — managed under{" "}
            <Link href="/admin/simulators">Simulators</Link>.
          </li>
        </ul>
        <p className={styles.footerNote}>
          {user.firstName}, this page is intentionally a hub for now — the full CMS UI ships in
          Sprint 11+.
        </p>
      </Card>
    </div>
  );
}

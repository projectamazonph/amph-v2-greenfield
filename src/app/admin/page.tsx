/**
 * /admin — admin dashboard.
 *
 * STORY-046. Server component.
 *
 * Hallmark · macrostructure: Stat-Led + Workbench sub-section
 *   · the page is split: six KPI tiles at the top (Stat-Led),
 *     then two short card sections below for "Recent activity"
 *     and "Pending actions" (Workbench). The two patterns coexist
 *     because the KPIs need a flat grid, and the secondary
 *     sections need stacked listable cards.
 *   · stat tiles use a hairline left accent + tabular numbers;
 *     numbers are mono, labels are uppercase eyebrow.
 *   · empty states use Phosphor icons (not emoji) + a real
 *     explanation, not a "coming soon" placeholder.
 *
 * SOLID: this is a thin page. All business logic lives in
 * `GetAdminDashboardStats` (the use case). The page only:
 * 1. Calls `requireAdmin()` for the auth gate.
 * 2. Calls the use case to get the stats.
 * 3. Renders them.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { Pulse, MegaphoneSimple, Receipt, Clock } from "@phosphor-icons/react/dist/ssr";
import { formatPhp } from "./_lib/formatPhp";
import styles from "./page.module.css";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  const container = buildContainer();
  const [statsResult, activityResult] = await Promise.all([
    container.getAdminDashboardStats.execute(),
    container.listAuditLogs.execute({ filters: { limit: 5 } }),
  ]);

  if (!statsResult.ok) {
    return (
      <div>
        <TopBar title="Admin Dashboard" subtitle={`Welcome, ${user.firstName}`} />
        <Card padding={6}>
          <p className={styles.error}>
            Failed to load dashboard stats: {statsResult.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const stats = statsResult.value;
  const recentActivity = activityResult.ok ? activityResult.value.entries : [];

  return (
    <div>
      <TopBar
        title="Admin Dashboard"
        subtitle={`Welcome back, ${user.firstName}`}
        breadcrumb={
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowMark} aria-hidden />
            Admin
          </span>
        }
      />

      <section className={styles.statGrid} aria-label="Platform statistics">
        <StatTile label="Total Students" value={stats.totalStudents.toString()} />
        <StatTile label="Total Courses" value={stats.totalCourses.toString()} />
        <StatTile label="Active Enrollments" value={stats.activeEnrollments.toString()} />
        <StatTile
          label="Total Revenue"
          value={
            <>
              <span className={styles.currency}>₱</span>
              {formatPhp(stats.totalRevenuePhp).replace(/^₱\s?/, "")}
            </>
          }
        />
        <StatTile label="Certificates Issued" value={stats.certificatesIssued.toString()} />
        <StatTile label="Pending Refunds" value={stats.pendingRefunds.toString()} />
      </section>

      <div className={styles.quickActions}>
        <Link href="/admin/courses/new" className="btn btn-ghost">
          + Create Course
        </Link>
        <Link href="/admin/users/new" className="btn btn-ghost">
          + Add User
        </Link>
      </div>

      <section className={styles.lowerSection}>
        <Card padding={6} className={styles.workflowCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              <Pulse size={18} weight="bold" aria-hidden />
              Recent activity
              <span className={styles.sectionCount}>{recentActivity.length}</span>
            </h2>
          </header>
          {recentActivity.length > 0 ? (
            <ul className={styles.activityList}>
              {recentActivity.map((entry) => (
                <li key={entry.id} className={styles.activityItem}>
                  <Clock size={16} aria-hidden />
                  <div>
                    <strong>{entry.action.replaceAll(".", " ")}</strong>
                    <span>
                      {entry.targetType} {entry.targetId} ·{" "}
                      {entry.occurredAt.toLocaleString("en-US")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Clock size={28} weight="duotone" aria-hidden />}
              title="No admin activity yet"
              body="Audited admin actions will appear here after the first change."
              action={
                <Link href="/admin/audit-log" className="btn btn-ghost">
                  Open audit log
                </Link>
              }
            />
          )}
        </Card>

        <Card padding={6} className={styles.workflowCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              <MegaphoneSimple size={18} weight="bold" aria-hidden />
              Pending actions
              <span className={styles.sectionCount}>{stats.pendingRefunds}</span>
            </h2>
          </header>
          <EmptyState
            icon={<Receipt size={28} weight="duotone" aria-hidden />}
            title={stats.pendingRefunds > 0 ? "Refund requests need review" : "Nothing to clear"}
            body={
              stats.pendingRefunds > 0
                ? `${stats.pendingRefunds} refund request${stats.pendingRefunds === 1 ? "" : "s"} waiting for an admin decision.`
                : "There are no pending refund requests."
            }
            action={
              <Link href="/admin/refunds" className="btn btn-ghost">
                Review refunds
              </Link>
            }
          />
        </Card>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.tile}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} aria-hidden>
        {icon}
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

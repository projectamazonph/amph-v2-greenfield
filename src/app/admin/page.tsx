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

import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { Pulse, ClipboardText, MegaphoneSimple, Receipt } from "@phosphor-icons/react/dist/ssr";
import { formatPhp } from "./_lib/formatPhp";
import styles from "./page.module.css";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  const container = buildContainer();
  const statsResult = await container.getAdminDashboardStats.execute();

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

      <section className={styles.lowerSection}>
        <Card padding={6} className={styles.workflowCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              <Pulse size={18} weight="bold" aria-hidden />
              Recent activity
              <span className={styles.sectionCount}>0</span>
            </h2>
          </header>
          <EmptyState
            icon={<ClipboardText size={28} weight="duotone" aria-hidden />}
            title="No activity logged yet"
            body="The audit log captures admin sign-ins, payouts, refunds, and course edits. It will populate here as the team works."
          />
        </Card>

        <Card padding={6} className={styles.workflowCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              <MegaphoneSimple size={18} weight="bold" aria-hidden />
              Pending actions
              <span className={styles.sectionCount}>0</span>
            </h2>
          </header>
          <EmptyState
            icon={<Receipt size={28} weight="duotone" aria-hidden />}
            title="Nothing to clear"
            body="No refund requests, flagged content, or stale enrollments right now. When something needs your attention, it shows up here first."
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

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} aria-hidden>
        {icon}
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}

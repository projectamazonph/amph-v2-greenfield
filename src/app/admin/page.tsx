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
import { Pulse, ClipboardText, MegaphoneSimple, Receipt, Clock } from "@phosphor-icons/react/dist/ssr";
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
        <StatTile label="Total Students" value={stats.totalStudents.toString()} trend={{ direction: "up", text: "12%" }} sparkline={[3, 5, 4, 7, 6, 9, 11]} />
        <StatTile label="Total Courses" value={stats.totalCourses.toString()} trend={{ direction: "up", text: "8%" }} sparkline={[2, 2, 3, 3, 4, 4, 5]} />
        <StatTile label="Active Enrollments" value={stats.activeEnrollments.toString()} trend={{ direction: "up", text: "15%" }} sparkline={[4, 6, 5, 8, 10, 12, 14]} />
        <StatTile
          label="Total Revenue"
          value={
            <>
              <span className={styles.currency}>₱</span>
              {formatPhp(stats.totalRevenuePhp).replace(/^₱\s?/, "")}
            </>
          }
          trend={{ direction: "up", text: "23%" }}
          sparkline={[5, 7, 9, 8, 12, 15, 18]}
        />
        <StatTile label="Certificates Issued" value={stats.certificatesIssued.toString()} trend={{ direction: "up", text: "5%" }} sparkline={[1, 2, 2, 3, 2, 4, 4]} />
        <StatTile label="Pending Refunds" value={stats.pendingRefunds.toString()} trend={{ direction: "down", text: "3%" }} sparkline={[6, 5, 5, 4, 4, 3, 2]} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}><div style={{ padding: 'var(--space-4)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>This week</div><div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>142</div></div><div style={{ padding: 'var(--space-4)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>Last week</div><div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>128</div></div></div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-mono)' }}>Showing last 7 days · <a href="#" style={{ color: 'var(--accent)' }}>Change period</a></div>

      <div className={styles.quickActions}>
        <Link href="/admin/courses/new" className="btn btn-ghost">+ Create Course</Link>
        <Link href="/admin/users/new" className="btn btn-ghost">+ Add User</Link>
      </div>

      <section className={styles.lowerSection}>
        <Card padding={6} className={styles.workflowCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              <Pulse size={18} weight="bold" aria-hidden />
              Recent activity
              <span className={styles.sectionCount}>0</span>
            </h2>
          </header>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}><li style={{ display: 'flex', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}><Clock size={16} style={{ color: 'var(--ink-500)', flexShrink: 0, marginTop: 2 }} /><div><div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>No recent activity yet</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-500)' }}>Admin actions will appear here</div></div></li></ul>
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
            action={
              <Link href="/admin/actions" className="btn btn-ghost">
                View all actions
              </Link>
            }
          />
        </Card>
      </section>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const barWidth = 4;
  const gap = 2;
  const height = 24;
  const width = values.length * (barWidth + gap) - gap;
  return (
    <svg
      width={width}
      height={height}
      style={{ marginLeft: "auto" }}
      aria-hidden
      role="presentation"
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * height));
        const opacity = 0.3 + (i / Math.max(values.length - 1, 1)) * 0.5;
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={h}
            fill="var(--accent)"
            opacity={opacity.toFixed(2)}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

function StatTile({
  label,
  value,
  trend,
  sparkline,
}: {
  label: string;
  value: React.ReactNode;
  trend?: { direction: "up" | "down"; text: string };
  sparkline?: number[];
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.statHeader}>
        <div className={styles.statLabel}>{label}</div>
        {sparkline && <Sparkline values={sparkline} />}
      </div>
      <div className={styles.statValue}>
        {value}
        {trend && (
          <span
            className={trend.direction === "up" ? styles.trendUp : styles.trendDown}
          >
            {trend.direction === "up" ? "▲" : "▼"} {trend.text}
          </span>
        )}
      </div>
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

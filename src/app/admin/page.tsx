/**
 * /admin — admin dashboard.
 *
 * STORY-046. Server component.
 *
 * Structure (per design spec §9.2):
 *   - TopBar with "Admin Dashboard" + welcome subtitle
 *   - 6 stat tiles in a row (using Card from @/components/ui)
 *   - Recent activity placeholder (table, no data yet)
 *   - Pending actions placeholder (refund requests, flagged items)
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
import { Card } from "@/components/ui";
import { formatPhp } from "./_lib/formatPhp";
import styles from "./page.module.css";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  const container = buildContainer();
  const statsResult = await container.getAdminDashboardStats.execute();

  if (!statsResult.ok) {
    // The page can't render the dashboard without stats. Render an
    // error state instead of crashing. In the future, this could
    // be a proper error boundary.
    return (
      <div>
        <TopBar
          title="Admin Dashboard"
          subtitle={`Welcome, ${user.firstName}`}
        />
        <Card padding="comfortable">
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
      />

      <section
        className={styles.statGrid}
        aria-label="Platform statistics"
      >
        <StatTile
          label="Total Students"
          value={stats.totalStudents.toString()}
        />
        <StatTile
          label="Total Courses"
          value={stats.totalCourses.toString()}
        />
        <StatTile
          label="Active Enrollments"
          value={stats.activeEnrollments.toString()}
        />
        <StatTile
          label="Total Revenue"
          value={formatPhp(stats.totalRevenuePhp)}
        />
        <StatTile
          label="Certificates Issued"
          value={stats.certificatesIssued.toString()}
        />
        <StatTile
          label="Pending Refunds"
          value={stats.pendingRefunds.toString()}
        />
      </section>

      <section className={styles.lowerSection}>
        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <p className={styles.emptyState}>
            Activity log coming in a future story.
          </p>
        </Card>

        <Card padding="comfortable">
          <h2 className={styles.sectionTitle}>Pending actions</h2>
          <p className={styles.emptyState}>
            No pending actions. Refund requests and flagged items will
            appear here.
          </p>
        </Card>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="comfortable">
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </Card>
  );
}

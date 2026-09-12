/**
 * /admin/maintenance — admin maintenance mode control panel.
 *
 * P1-08 (P4 PR-A). Server component that loads the current state
 * via `GetMaintenanceStatus` and hands it to the client form for
 * editing. The form posts to `toggleMaintenanceAction`, which
 * delegates to `AdminToggleMaintenance`.
 *
 * Layout uses the existing admin chrome (TopBar + Card from
 * Astryx) so the page is visually consistent with the other
 * admin pages.
 */

import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { MaintenanceToggleForm } from "./MaintenanceToggleForm";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{ saved?: string }>;
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const justSaved = sp.saved === "1";

  const container = buildContainer();
  const statusResult = await container.getMaintenanceStatus.execute();
  const status = statusResult.ok
    ? statusResult.value
    : {
        enabled: false,
        message: null,
        allowedAdminIds: [],
        updatedAt: null,
        updatedById: null,
      };

  const statusLabel = status.enabled
    ? { label: "Maintenance mode is ON", className: styles.statusOn }
    : { label: "Maintenance mode is OFF", className: styles.statusOff };

  return (
    <div>
      <TopBar
        title="Maintenance mode"
        subtitle="Kill switch that serves a 503 page to non-admin visitors"
      />

      {justSaved && (
        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <p className={styles.notice} role="status">
            Maintenance settings saved. The change takes effect on the next
            request.
          </p>
        </Card>
      )}

      <Card padding={6} className={styles.cardGap}>
        <p className={styles.help}>
          Flip this on when you need to take the site offline for a deploy,
          database migration, or incident. The Next.js proxy rewrites every
          non-admin request to the public <code>/maintenance</code> page with a
          503 status. Admins with the bypass cookie can still reach
          <code>/admin/*</code>.
        </p>
        <p className={styles.statusRow}>
          <span className={statusLabel.className} aria-live="polite">
            {statusLabel.label}
          </span>
          {status.updatedAt && (
            <span className={styles.statusMeta}>
              Last updated {status.updatedAt.toLocaleString()} by{" "}
              <code>{status.updatedById}</code>
            </span>
          )}
        </p>
      </Card>

      <Card padding={6}>
        <MaintenanceToggleForm
          initialEnabled={status.enabled}
          initialMessage={status.message ?? ""}
        />
      </Card>
    </div>
  );
}
/**
 * /admin/maintenance - Maintenance mode toggle page.
 * P1-08: Maintenance mode / kill switch.
 */

import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { getMaintenanceAction, toggleMaintenanceAction } from "@/app/actions/LMS";
import { ToggleMaintenance } from "@/usecases/LMS/ToggleMaintenance";
import styles from "./page.module.css";

export default async function MaintenancePage() {
  const admin = await requireAdmin();
  const maintenanceResult = await getMaintenanceAction();
  const maintenance = maintenanceResult.ok ? maintenanceResult.value : null;

  return (
    <div>
      <TopBar title="Maintenance Mode" subtitle="Enable/disable site maintenance mode" />
      
      <Card padding={6} className={styles.card}>
        <h2 className={styles.title}>Maintenance Mode</h2>
        <p className={styles.description}>
          When enabled, all non-admin users will see a maintenance page.
          Admins can still access the admin panel.
        </p>

        <div className={styles.status}>
          <span className={styles.statusLabel}>Current Status:</span>
          <span className={maintenance?.isActive ? styles.statusActive : styles.statusInactive}>
            {maintenance?.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        {maintenance?.message && (
          <div className={styles.message}>
            <span className={styles.messageLabel}>Message:</span>
            <span>{maintenance.message}</span>
          </div>
        )}

        <form action={toggleMaintenanceAction} className={styles.form}>
          <input
            type="hidden"
            name="isActive"
            value={String(!maintenance?.isActive)}
          />
          <button type="submit" className={styles.button}>
            {maintenance?.isActive ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
          </button>
        </form>
      </Card>
    </div>
  );
}

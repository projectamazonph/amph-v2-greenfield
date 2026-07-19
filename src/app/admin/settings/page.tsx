/**
 * /admin/settings — admin system settings view.
 *
 * STORY-050e. Read-only dashboard for runtime config + operational
 * status. Future story (Sprint 11+) will add write actions.
 */
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const session = await requireAdmin();

  // We do not read process.env at runtime to avoid leaking secrets;
  // the placeholder shows *presence* only.
  const config = [
    {
      key: "DATABASE_URL",
      present: !!process.env.DATABASE_URL,
      description: "Postgres connection string",
    },
    {
      key: "JWT_SECRET",
      present: !!process.env.JWT_SECRET,
      description: "HMAC secret for session cookies",
    },
    {
      key: "PAYMONGO_SECRET_KEY",
      present: !!process.env.PAYMONGO_SECRET_KEY,
      description: "PayMongo API secret",
    },
    {
      key: "RESEND_API_KEY",
      present: !!process.env.RESEND_API_KEY,
      description: "Transactional email API key",
    },
  ];

  return (
    <div>
      <TopBar
        title="Settings"
        subtitle="System configuration and operational status"
      />

      <Card padding="comfortable" style={{ marginBottom: "1rem" }}>
        <h2 className={styles.sectionTitle}>Environment</h2>
        <p className={styles.help}>
          The current values of required environment variables. Values are never displayed.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {config.map((c) => (
              <tr key={c.key}>
                <td className={styles.key}>{c.key}</td>
                <td>
                  {c.present ? (
                    <span className={`${styles.statusBadge} ${styles.set}`}>Set</span>
                  ) : (
                    <span className={`${styles.statusBadge} ${styles.unset}`}>Missing</span>
                  )}
                </td>
                <td className={styles.description}>{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card padding="comfortable" style={{ marginBottom: "1rem" }}>
        <h2 className={styles.sectionTitle}>Actor</h2>
        <dl className={styles.dl}>
          <dt>Signed-in admin</dt>
          <dd className={styles.mono}>{session.id}</dd>
          <dt>Email</dt>
          <dd>{session.email}</dd>
          <dt>Role</dt>
          <dd>{session.role}</dd>
        </dl>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionTitle}>Coming soon</h2>
        <ul className={styles.list}>
          <li>Edit site name + tagline (Sprint 11+)</li>
          <li>Configure default XP multipliers (Sprint 11+)</li>
          <li>Toggle maintenance mode (Sprint 11+)</li>
          <li>Custom certificate template (Sprint 11+)</li>
        </ul>
      </Card>
    </div>
  );
}

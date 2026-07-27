/**
 * /admin/settings — admin system settings view.
 *
 * STORY-050e. Read-only dashboard for runtime config + operational
 * status. Future story (Sprint 11+) will add write actions.
 */
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { disableTwoFactorAction, enableTwoFactorAction } from "@/app/actions/twoFactor.action";
import styles from "./page.module.css";

const twoFactorErrorMessage: Record<string, string> = {
  already_enabled: "Two-factor authentication is already enabled.",
  wrong_password: "Incorrect password — two-factor authentication was not disabled.",
  user_not_found: "Something went wrong — please try again.",
  db_error: "Something went wrong — please try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; "2fa"?: string }>;
}) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const twoFactorError = sp.error ? (twoFactorErrorMessage[sp.error] ?? null) : null;
  const twoFactorNotice =
    sp["2fa"] === "enabled"
      ? "Two-factor authentication is now enabled on your account."
      : sp["2fa"] === "disabled"
        ? "Two-factor authentication has been disabled."
        : null;

  async function enable() {
    "use server";
    await enableTwoFactorAction();
  }

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
      key: "PAYMONGO_SECRET",
      present: !!process.env.PAYMONGO_SECRET,
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
      <TopBar title="Settings" subtitle="System configuration and operational status" />

      <Card padding={6} style={{ marginBottom: "1rem" }}>
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

      <Card padding={6} style={{ marginBottom: "1rem" }}>
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

      <Card padding={6} style={{ marginBottom: "1rem" }}>
        <h2 className={styles.sectionTitle}>Two-factor authentication</h2>
        <p className={styles.help}>
          Adds a 6-digit code from an authenticator app to your login, on top of your password.
          Opt-in — other admin accounts are unaffected until they enable it themselves.
        </p>

        {twoFactorNotice && <p className={styles.twoFactorNotice}>{twoFactorNotice}</p>}
        {twoFactorError && <p className={styles.twoFactorError}>{twoFactorError}</p>}

        {session.twoFactorEnabled ? (
          <>
            <p className={styles.twoFactorStatus}>
              <span className={`${styles.statusBadge} ${styles.set}`}>Enabled</span>
            </p>
            <form action={disableTwoFactorAction} className={styles.twoFactorForm}>
              <label className={styles.field}>
                <span className={styles.label}>Current password</span>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className={styles.input}
                  placeholder="••••••••"
                />
                <span className={styles.hint}>
                  Confirms it's really you before turning this off.
                </span>
              </label>
              <button type="submit" className={styles.dangerButton}>
                Disable two-factor authentication
              </button>
            </form>
          </>
        ) : (
          <>
            <p className={styles.twoFactorStatus}>
              <span className={`${styles.statusBadge} ${styles.unset}`}>Disabled</span>
            </p>
            <form action={enable}>
              <button type="submit" className={styles.submitButton}>
                Enable two-factor authentication
              </button>
            </form>
          </>
        )}
      </Card>

      <Card padding={6}>
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

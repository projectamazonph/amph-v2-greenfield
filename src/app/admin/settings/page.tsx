/**
 * /admin/settings — admin system settings view.
 *
 * Runtime configuration, operational links, and admin 2FA controls.
 */
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { enableTwoFactorAction } from "@/app/actions/twoFactor.action";
import { DisableTwoFactorForm } from "./DisableTwoFactorForm";
import styles from "./page.module.css";

const twoFactorErrorMessage: Record<string, string> = {
  already_enabled: "Two-factor authentication is already enabled.",
  wrong_password: "Incorrect password. Two-factor authentication was not disabled.",
  user_not_found: "Something went wrong. Please try again.",
  db_error: "Something went wrong. Please try again.",
  twoFactorRequired:
    "Two-factor authentication is required for all admin accounts. Please enable it below.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; "2fa"?: string }>;
}) {
  const session = await requireAdmin(undefined, true);
  const sp = await searchParams;
  const twoFactorNotice =
    sp["2fa"] === "enabled"
      ? "Two-factor authentication is now enabled on your account."
      : sp["2fa"] === "disabled"
        ? "Two-factor authentication has been disabled."
        : null;
  // M5 fix: disableTwoFactorError from ?error= is now handled inline by
  // DisableTwoFactorForm via useActionState — no query-string error needed.
  // The enable action still uses ?error= redirect; surface it here.
  const enableError = sp.error ? (twoFactorErrorMessage[sp.error] ?? null) : null;

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

      <Card padding={6} className={styles.cardGap}>
        <h2 className={styles.sectionTitle}>Environment</h2>
        <p className={styles.help}>
          The current values of required environment variables. Values are never displayed.
        </p>
        <table className={styles.table}>
          {/* L11 fix: <caption> provides WCAG 1.3.1 accessible name for the table. */}
          <caption className="sr-only">Environment variable configuration status</caption>
          <thead>
            <tr>
              <th scope="col">Variable</th>
              <th scope="col">Status</th>
              <th scope="col">Description</th>
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

      <Card padding={6} className={styles.cardGap}>
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

      <Card padding={6} className={styles.cardGap}>
        <h2 className={styles.sectionTitle}>Two-factor authentication</h2>
        <p className={styles.help}>
          Adds a 6-digit code from an authenticator app to your login, on top of your password.
          Required for all admin accounts.
        </p>

        {twoFactorNotice && <p className={styles.twoFactorNotice}>{twoFactorNotice}</p>}
        {enableError && <p className={styles.twoFactorError}>{enableError}</p>}

        {session.twoFactorEnabled ? (
          <>
            <p className={styles.twoFactorStatus}>
              <span className={`${styles.statusBadge} ${styles.set}`}>Enabled</span>
            </p>
            <DisableTwoFactorForm />
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
        <h2 className={styles.sectionTitle}>Operations</h2>
        <p className={styles.help}>
          Review security-sensitive changes and verify content services.
        </p>
        <div className={styles.operationLinks}>
          <Link href="/admin/audit-log">Open audit log</Link>
          <Link href="/admin/resources">Manage download center</Link>
          <Link href="/admin/email-templates">Manage email templates</Link>
        </div>
      </Card>
    </div>
  );
}

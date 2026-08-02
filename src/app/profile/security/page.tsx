/**
 * /profile/security — student two-factor authentication settings.
 *
 * STORY-097. Mirrors /admin/settings' 2FA section but for any
 * authenticated user (requireAuth, not requireAdmin) — the underlying
 * EnableTwoFactor/ConfirmTwoFactor/DisableTwoFactor use cases are
 * role-agnostic.
 */
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@astryxdesign/core";
import {
  disableStudentTwoFactorAction,
  enableStudentTwoFactorAction,
} from "@/app/actions/studentTwoFactor.action";
import styles from "../../admin/settings/page.module.css";

const twoFactorErrorMessage: Record<string, string> = {
  already_enabled: "Two-factor authentication is already enabled.",
  wrong_password: "Incorrect password. Two-factor authentication was not disabled.",
  user_not_found: "Something went wrong. Please try again.",
  db_error: "Something went wrong. Please try again.",
};

interface PageProps {
  searchParams: Promise<{ error?: string; "2fa"?: string }>;
}

export default async function StudentSecurityPage({ searchParams }: PageProps) {
  const session = await requireAuth();
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
    await enableStudentTwoFactorAction();
  }

  return (
    <StudentShell user={session}>
      <main style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            marginBottom: "var(--space-6)",
          }}
        >
          Security
        </h1>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>Two-factor authentication</h2>
          <p className={styles.help}>
            Adds a 6-digit code from an authenticator app to your login, on top of your password.
            Opt-in. Your account works the same either way until you turn this on.
          </p>

          {twoFactorNotice && <p className={styles.twoFactorNotice}>{twoFactorNotice}</p>}
          {twoFactorError && <p className={styles.twoFactorError}>{twoFactorError}</p>}

          {session.twoFactorEnabled ? (
            <>
              <p className={styles.twoFactorStatus}>
                <span className={`${styles.statusBadge} ${styles.set}`}>Enabled</span>
              </p>
              <form action={disableStudentTwoFactorAction} className={styles.twoFactorForm}>
                <label className={styles.field}>
                  <span className={styles.label}>Current password</span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    className={styles.input}
                    placeholder="********"
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
      </main>
    </StudentShell>
  );
}

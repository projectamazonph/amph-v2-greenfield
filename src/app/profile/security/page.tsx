/**
 * /profile/security — student two-factor authentication settings.
 *
 * STORY-097. Mirrors /admin/settings' 2FA section but for any
 * authenticated user (requireAuth, not requireAdmin) — the underlying
 * EnableTwoFactor/ConfirmTwoFactor/DisableTwoFactor use cases are
 * role-agnostic.
 */
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import {
  disableStudentTwoFactorAction,
  enableStudentTwoFactorAction,
} from "@/app/actions/studentTwoFactor.action";
import styles from "../profile-subpage.module.css";

const twoFactorErrorMessage: Record<string, string> = {
  already_enabled: "Two-factor authentication is already enabled.",
  wrong_password: "Incorrect password. Two-factor authentication was not disabled.",
  user_not_found:
    "We could not find your account. Your 2FA settings are unchanged. Sign in again and try once more.",
  db_error:
    "We could not update your security settings. Your 2FA state is unchanged. Try again in a moment.",
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
      <main id="main-content" tabIndex={-1} className={styles.page} aria-labelledby="security-title">
        <Link href="/profile" className={styles.backLink}>
          ← Back to profile
        </Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Account settings</span>
          <h1 id="security-title" className={styles.title}>
            Security
          </h1>
          <p className={styles.intro}>
            Protect your academy account with an authenticator code in addition to your password.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="two-factor-title">
          <p className={styles.sectionKicker}>Sign-in protection</p>
          <h2 id="two-factor-title" className={styles.sectionTitle}>
            Two-factor authentication
          </h2>
          <p className={styles.help}>
            Two-factor authentication adds a 6-digit code from an authenticator app to your login.
            Your account works the same way until you choose to turn it on.
          </p>

          {twoFactorNotice ? (
            <p className={styles.notice} role="status">
              {twoFactorNotice}
            </p>
          ) : null}
          {twoFactorError ? (
            <p className={styles.error} role="alert">
              {twoFactorError}
            </p>
          ) : null}

          {session.twoFactorEnabled ? (
            <>
              <p className={styles.status} role="status">
                <span className={styles.statusBadge}>Enabled</span>
              </p>
              <form action={disableStudentTwoFactorAction} className={styles.fields}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Current password</span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    className={styles.input}
                    placeholder="********"
                  />
                  <span className={styles.hint}>
                    Confirms it&apos;s really you before turning this off.
                  </span>
                </label>
                <button type="submit" className={styles.danger}>
                  Disable two-factor authentication
                </button>
              </form>
            </>
          ) : (
            <>
              <p className={styles.status} role="status">
                <span className={styles.statusBadge}>Disabled</span>
              </p>
              <form action={enable} className={styles.actions}>
                <button type="submit" className={styles.primary}>
                  Enable two-factor authentication
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </StudentShell>
  );
}

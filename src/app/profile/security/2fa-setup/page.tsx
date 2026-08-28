/**
 * /profile/security/2fa-setup — confirm a pending TOTP 2FA enrollment.
 *
 * STORY-097. Student equivalent of /admin/settings/2fa-setup. Reached
 * only via the "Enable two-factor authentication" button on
 * /profile/security (EnableTwoFactor persists a pending secret first).
 * Re-reads that already-persisted secret rather than calling
 * EnableTwoFactor again, which would generate a new secret and
 * invalidate whatever the user already scanned.
 */
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { confirmStudentTwoFactorAction } from "@/app/actions/studentTwoFactor.action";
import { TWO_FACTOR_ISSUER } from "@/usecases/EnableTwoFactor";
import styles from "../../profile-subpage.module.css";

const errorMessage: Record<string, string> = {
  invalid_code: "That code didn't match. Check your authenticator app and try again.",
  no_pending_secret: "No pending setup found. Start over below.",
  user_not_found:
    "We could not find your account. Your 2FA setup is unchanged. Sign in again and start over.",
  db_error: "We could not save your 2FA setup. Your account is unchanged. Try again in a moment.",
};

export default async function StudentTwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuth();
  const sp = await searchParams;
  const errorText = sp.error ? (errorMessage[sp.error] ?? null) : null;

  if (session.twoFactorEnabled) {
    redirect("/profile/security");
  }

  const container = buildContainer();
  const secretResult = await container.userRepo.getTwoFactorSecret(session.id);
  if (!secretResult.ok) {
    redirect("/profile/security");
  }
  const secret = secretResult.value;

  if (!secret) {
    redirect("/profile/security");
  }

  const keyUri = container.totpService.keyUri({
    secret,
    accountName: session.email,
    issuer: TWO_FACTOR_ISSUER,
  });

  return (
    <StudentShell user={session}>
      <main
        id="main-content"
        tabIndex={-1}
        className={styles.page}
        aria-labelledby="setup-title"
      >
        <Link href="/profile/security" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden /> Back to security
        </Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Account settings</span>
          <h1 id="setup-title" className={styles.title}>
            Set up two-factor authentication
          </h1>
          <p className={styles.intro}>
            Scan the code, then confirm with a 6-digit code to finish protecting your account.
          </p>
        </header>

        <ol className={styles.steps} aria-label="Two-factor setup progress">
          <li className={`${styles.step} ${styles.stepActive}`} aria-current="step">
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>Add authenticator</span>
          </li>
          <li className={`${styles.step} ${styles.stepActive}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>Verify code</span>
          </li>
        </ol>

        {errorText ? (
          <p className={styles.error} role="alert">
            {errorText}
          </p>
        ) : null}

        <div className={styles.stack}>
          <section className={styles.section} aria-labelledby="authenticator-title">
            <p className={styles.sectionKicker}>Step 1</p>
            <h2 id="authenticator-title" className={styles.sectionTitle}>
              Add this account to your authenticator app
            </h2>
            <p className={styles.help}>
              Scan the QR code below with your authenticator app (Google Authenticator, 1Password,
              Authy, or another compatible app), or enter the key manually if scanning is not
              available.
            </p>
            <span className={styles.fieldLabel}>Manual entry key</span>
            <code className={styles.secretKey}>{secret}</code>
            <span className={styles.fieldLabel}>Setup URI</span>
            <code className={styles.keyUri}>{keyUri}</code>
          </section>

          <section className={styles.section} aria-labelledby="confirm-code-title">
            <p className={styles.sectionKicker}>Step 2</p>
            <h2 id="confirm-code-title" className={styles.sectionTitle}>
              Confirm with a code
            </h2>
            <form action={confirmStudentTwoFactorAction} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>6-digit code</span>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  className={styles.input}
                  placeholder="123456"
                  autoFocus
                />
              </label>
              <button type="submit" className={styles.primary}>
                Confirm and enable
              </button>
            </form>
          </section>
        </div>
      </main>
    </StudentShell>
  );
}

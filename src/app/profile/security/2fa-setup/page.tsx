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
import { Card } from "@astryxdesign/core";
import { confirmStudentTwoFactorAction } from "@/app/actions/studentTwoFactor.action";
import { TWO_FACTOR_ISSUER } from "@/usecases/EnableTwoFactor";
import styles from "../../../admin/settings/2fa-setup/page.module.css";

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
    if (secretResult.error.kind === "not_found") {
      redirect("/profile/security");
    }
    throw new Error("Failed to load two-factor setup");
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
      <main id="main-content" tabIndex={-1} style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
        <Link href="/profile/security" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden /> Back to security
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            marginBottom: "var(--space-2)",
          }}
        >
          Set up two-factor authentication
        </h1>
        <p className={styles.help}>Scan the code, then confirm with a 6-digit code to finish.</p>

        <ol className={styles.steps} aria-label="2FA setup progress">
          <li className={`${styles.step} ${styles.stepActive}`} aria-current="step">
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>Scan QR code</span>
          </li>
          <li className={`${styles.step} ${styles.stepActive}`} aria-current="step">
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>Verify code</span>
          </li>
        </ol>

        {errorText && (
          <p className={styles.error} role="alert">
            {errorText}
          </p>
        )}

        <Card padding={6} style={{ marginBottom: "1rem" }}>
          <h2 className={styles.sectionTitle}>1. Add this account to your authenticator app</h2>
          <p className={styles.help}>
            Scan the QR code below with your authenticator app (Google Authenticator, 1Password,
            Authy, etc.), or enter the key manually if your app doesn't support scanning.
          </p>
          <span className={styles.label}>Manual entry key</span>
          <code className={styles.secretKey}>{secret}</code>
          <span className={styles.label}>Setup URI</span>
          <code className={styles.keyUri}>{keyUri}</code>
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle}>2. Confirm with a code</h2>
          <form action={confirmStudentTwoFactorAction} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>6-digit code</span>
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
            <button type="submit" className={styles.submitButton}>
              Confirm and enable
            </button>
          </form>
        </Card>
      </main>
    </StudentShell>
  );
}

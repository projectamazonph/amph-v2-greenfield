/**
 * /admin/settings/2fa-setup — confirm a pending TOTP 2FA enrollment.
 *
 * Audit hardening follow-up. Reached only via the "Enable two-factor
 * authentication" button on /admin/settings (EnableTwoFactor persists
 * a pending secret first). This page re-reads that already-persisted
 * secret and recomputes the keyUri directly — it does NOT call
 * EnableTwoFactor again, which would generate (and persist) a brand
 * new secret and invalidate whatever the admin already scanned.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { confirmTwoFactorAction } from "@/app/actions/twoFactor.action";
import { TWO_FACTOR_ISSUER } from "@/usecases/EnableTwoFactor";
import styles from "./page.module.css";

const errorMessage: Record<string, string> = {
  invalid_code: "That code didn't match. Check your authenticator app and try again.",
  no_pending_secret: "No pending setup found. Start over below.",
  user_not_found: "Something went wrong. Please try again.",
  db_error: "Something went wrong. Please try again.",
};

export default async function TwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const errorText = sp.error ? (errorMessage[sp.error] ?? null) : null;

  if (session.twoFactorEnabled) {
    redirect("/admin/settings");
  }

  const container = buildContainer();
  const secretResult = await container.userRepo.getTwoFactorSecret(session.id);
  const secret = secretResult.ok ? secretResult.value : null;

  if (!secret) {
    // No pending enrollment — send them back to start it.
    redirect("/admin/settings");
  }

  const keyUri = container.totpService.keyUri({
    secret,
    accountName: session.email,
    issuer: TWO_FACTOR_ISSUER,
  });

  return (
    <div>
      <Link href="/admin/settings" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to settings
      </Link>

      <TopBar
        title="Set up two-factor authentication"
        subtitle="Scan the code, then confirm with a 6-digit code to finish."
      />

      {errorText && <p className={styles.error}>{errorText}</p>}

      <Card padding={6} style={{ marginBottom: "1rem" }}>
        <h2 className={styles.sectionTitle}>1. Add this account to your authenticator app</h2>
        <p className={styles.help}>
          Scan the QR code below with your authenticator app (Google Authenticator, 1Password,
          Authy, etc.), or enter the key manually if your app doesn't support scanning.
        </p>
        {/* No QR image library in this codebase yet — manual entry is
            supported by every mainstream authenticator app. */}
        <span className={styles.label}>Manual entry key</span>
        <code className={styles.secretKey}>{secret}</code>
        <span className={styles.label}>Setup URI</span>
        <code className={styles.keyUri}>{keyUri}</code>
      </Card>

      <Card padding={6}>
        <h2 className={styles.sectionTitle}>2. Confirm with a code</h2>
        <form action={confirmTwoFactorAction} className={styles.form}>
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
    </div>
  );
}

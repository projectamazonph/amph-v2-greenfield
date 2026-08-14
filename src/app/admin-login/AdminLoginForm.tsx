/**
 * AdminLoginForm — dedicated admin login form.
 *
 * Styled to look like an internal admin portal (dark accent, admin badge).
 * POSTs to /api/auth/admin-login which handles the ADMIN role check.
 */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./AdminLoginForm.module.css";

const errorMessage: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  account_suspended: "This account has been suspended.",
  account_locked: "This account is locked. Reset your password to unlock.",
  invalid_input: "Please enter your email and password.",
  rate_limited: "Too many login attempts. Please wait a few minutes.",
  not_admin: "This account does not have admin access.",
  totp_required: "Enter the 6-digit code from your authenticator app to continue.",
  invalid_totp_code: "That code didn't match. Check your authenticator app and try again.",
};

export function AdminLoginForm({ errorKind }: { errorKind: string | null }) {
  const errorText = errorKind ? (errorMessage[errorKind] ?? null) : null;
  const needsTotp = errorKind === "totp_required" || errorKind === "invalid_totp_code";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚙</span>
            <span>Admin Portal</span>
          </div>
          <h1 className={styles.title}>Sign in to admin</h1>
          <p className={styles.subtitle}>Access the Project Amazon PH Academy admin dashboard.</p>
        </div>

        {errorText && <div className={styles.alert}>{errorText}</div>}

        <form method="POST" action="/api/auth/admin-login" className={styles.form}>
          <Input
            name="email"
            label="Admin email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@example.com"
            size="md"
          />

          <Input
            name="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            size="md"
          />

          {/* Only accounts that went through EnableTwoFactor/ConfirmTwoFactor
              (opt-in) have twoFactorEnabled=true — this field is silently
              ignored by Login for every other account, so it's safe to
              always render rather than needing a two-step form. */}
          <Input
            name="totpCode"
            label="Two-factor code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            hint={
              needsTotp ? undefined : "Only needed if you've enabled two-factor authentication."
            }
            autoFocus={needsTotp}
            size="md"
          />

          <div className={styles.forgotRow}>
            <Link href="/reset-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" className={styles.submit}>
            Sign in
          </Button>
        </form>

        <p className={styles.backLink}>
          <Link href="/login" className={styles.backHref}>
            <ArrowLeft size={16} aria-hidden />{" "}Back to student login
          </Link>
        </p>
      </div>
    </div>
  );
}

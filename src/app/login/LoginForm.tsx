/**
 * LoginForm — pure HTML form that POSTs to /api/auth/login.
 *
 * STORY-066 refactor: the previous implementation used
 * `useActionState` + `useRouter` to invoke the loginAndRedirect
 * server action. That combination had a documented Next.js 16
 * pitfall where `redirect()` throws a NEXT_REDIRECT error that gets
 * swallowed under React 19 useActionState, producing a 500
 * "Server Components render" with a hashed digest in production.
 *
 * This form is now a plain HTML `<form method="POST">` pointing at
 * the /api/auth/login Route Handler. The browser handles the
 * 303 redirect natively; error states land back on
 * /login?error=<kind> where the page renders the alert. No client
 * state, no useEffect, no useRouter, no useActionState.
 *
 * Pure presentational. Renders the same fields as before. Receives
 * `redirectTo` (from the parent server component's searchParams)
 * and `errorKind` (also from searchParams) as props.
 */

import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import styles from "./LoginForm.module.css";

const errorMessage: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  account_suspended: "This account has been suspended. Contact support.",
  account_locked: "This account is locked. Reset your password to unlock.",
  invalid_input: "Please enter your email and password.",
  rate_limited: "Too many login attempts. Please wait a few minutes and try again.",
  totp_required: "Enter the 6-digit code from your authenticator app to continue.",
  invalid_totp_code: "That code didn't match. Check your authenticator app and try again.",
  oauth_unavailable: "Google sign-in is not set up right now. Use your email instead.",
  oauth_denied: "Google sign-in was cancelled. Try again or use your email.",
  oauth_state: "That sign-in attempt expired. Start over from this page.",
  oauth_exchange: "Google refused the sign-in. Try again or use your email.",
  oauth_profile: "Google did not share your profile. Try again or use your email.",
  oauth_unverified: "Your Google email is not verified. Verify it with Google first.",
  oauth_blocked: "This account cannot sign in right now. Contact support.",
  oauth_2fa_required:
    "This account uses two-factor authentication. Sign in with your email, password, and code.",
  oauth_failed: "Google sign-in failed. Try again or use your email.",
};

export function LoginForm({
  redirectTo,
  errorKind,
  googleEnabled = false,
}: {
  redirectTo: string;
  errorKind: string | null;
  /** P1-04: Google OAuth is wired (env present). Absent means hidden. */
  googleEnabled?: boolean;
}) {
  const errorText = errorKind ? (errorMessage[errorKind] ?? null) : null;
  const needsTotp = errorKind === "totp_required" || errorKind === "invalid_totp_code";

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Project Amazon PH Academy</div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your training.</p>
        </div>

        {errorText && (
          <div className="alert alert-error" role="alert">
            {errorText}
          </div>
        )}

        <form method="POST" action="/api/auth/login" className={styles.form}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <Input
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
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
            pattern="[0-9]*"
            maxLength={6}
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

        {googleEnabled && (
          <>
            <div className={styles.divider} aria-hidden="true">
              <span>or</span>
            </div>
            <Link href="/api/auth/oauth/google" className={styles.googleButton}>
              Continue with Google
            </Link>
          </>
        )}

        <p className={styles.altPrompt}>
          New to Project Amazon PH Academy?{" "}
          <Link href="/signup" className={styles.altLink}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

/**
 * /verify-email — STORY-007.
 *
 * Lands here from the verification email. Three paths:
 * 1. `?token=...` → auto-submit a POST form to verifyEmailAction.
 *    The action redirects to /dashboard (success) or back here
 *    with ?error=<kind> (failure).
 * 2. `?error=<kind>` → show the matching message + a resend link.
 * 3. Neither → show a generic "check your email" prompt with a
 *    resend link.
 *
 * We don't process the token server-side here because we want the
 * action to be the single entrypoint for verification (one place
 * to test, one place to log, one place to rate-limit).
 */

import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  "missing-token": {
    title: "No token in the link",
    body: "The verification link is missing a token. Use the link from your email, or request a new one below.",
  },
  "invalid-token": {
    title: "Invalid or unknown token",
    body: "This verification link is not valid. It may have been used or never issued. Request a new one below.",
  },
  expired: {
    title: "Link expired",
    body: "This verification link has expired. Request a new one below.",
  },
  "already-used": {
    title: "Link already used",
    body: "This verification link has already been used. If your email is verified, sign in normally.",
  },
  unexpected: {
    title: "Something went wrong",
    body: "We couldn't verify your email. Try again, or request a new link below.",
  },
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token, error } = await searchParams;

  // Error path — show the matching message.
  if (error) {
    const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES["unexpected"]!;
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{message.title}</h1>
        <p className={styles.body}>{message.body}</p>
        <Link href="/verify-email/sent" className={styles.cta}>
          Resend verification email
        </Link>
      </main>
    );
  }

  // Token path — auto-submit a form so we go through the action.
  // The action handles the actual VerifyEmail.execute() call.
  if (token) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Verifying your email…</h1>
        <p className={styles.body}>
          Hold on a second. We'll redirect you when verification is done.
        </p>
        <form method="post" action="/actions/verifyEmail" className={styles.form}>
          <input type="hidden" name="token" value={token} />
          <noscript>
            <button type="submit" className={styles.cta}>
              Click to verify
            </button>
          </noscript>
        </form>
        <script
          // The form auto-submits on load. The action redirects
          // to /dashboard on success or /verify-email?error=... on
          // failure.
          dangerouslySetInnerHTML={{
            __html: `document.forms[0] && document.forms[0].submit();`,
          }}
        />
      </main>
    );
  }

  // No token, no error — generic prompt.
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.body}>
        We sent a verification email when you signed up. Click the link
        in that email to verify your address. If you don't see it, check
        your spam folder or request a new one.
      </p>
      <Link href="/verify-email/sent" className={styles.cta}>
        Resend verification email
      </Link>
    </main>
  );
}

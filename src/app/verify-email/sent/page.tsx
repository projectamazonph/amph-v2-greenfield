/**
 * /verify-email/sent — STORY-007.
 *
 * The user is asked to check their email. They can also click
 * "Resend" to issue a fresh verification email (rate-limited
 * to 60s per user).
 *
 * The page reads ?status=<kind> to show a confirmation or a
 * "you've already verified" message.
 */

import { resendVerificationAction } from "@/app/actions/resendVerification.action";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    retryAfter?: string;
  }>;
}

export default async function SentPage({ searchParams }: Props) {
  const { status, retryAfter } = await searchParams;

  if (status === "sent") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>New email sent</h1>
        <p className={styles.body}>
          Check your inbox. The link in this email is valid for 24 hours.
        </p>
        <ResendForm />
      </main>
    );
  }

  if (status === "already-verified") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Already verified</h1>
        <p className={styles.body}>
          Your email is already verified. You can sign in.
        </p>
        <a href="/login" className={styles.cta}>
          Sign in
        </a>
      </main>
    );
  }

  if (status === "rate-limited" && retryAfter) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Wait a moment</h1>
        <p className={styles.body}>
          We just sent you a verification email. You can request a new one
          in 60 seconds.
        </p>
        <ResendForm disabled />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Couldn't resend</h1>
        <p className={styles.body}>
          Something went wrong. Try again in a moment.
        </p>
        <ResendForm />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.body}>
        We sent a verification link to your email. Click the link to
        verify your address. If you don't see it, check your spam
        folder, or send a new one.
      </p>
      <ResendForm />
    </main>
  );
}

function ResendForm({ disabled = false }: { disabled?: boolean }) {
  return (
    <form action={resendVerificationAction} className={styles.form}>
      <button
        type="submit"
        className={styles.cta}
        disabled={disabled}
      >
        Resend verification email
      </button>
    </form>
  );
}

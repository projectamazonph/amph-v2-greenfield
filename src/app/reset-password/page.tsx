/**
 * /reset-password — STORY-008.
 *
 * Request form. The user enters their email; we always say
 * "check your email" regardless of whether the email exists
 * (to prevent enumeration).
 */

import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/ResetRequestForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function ResetRequestPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Forgot your password?</h1>
      <p className={styles.body}>
        Enter the email you used to sign up. If the account exists,
        we'll send a reset link. Check your email after submitting.
      </p>
      <ResetRequestForm />
      <p className={styles.alt}>
        Remembered it? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}

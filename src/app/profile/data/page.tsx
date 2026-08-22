/**
 * /profile/data — data export + account deletion.
 *
 * STORY-096. Two sections: "Download my data" (client-triggered JSON
 * export) and a danger-zone "Delete my account" form (requires current
 * password, mirrors DisableTwoFactor's re-confirmation pattern).
 */
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import { ExportDataButton } from "@/components/profile/ExportDataButton";
import { deleteAccountAction } from "@/app/actions/deleteAccount.action";
import styles from "../profile-subpage.module.css";

const errorMessage: Record<string, string> = {
  wrong_password: "Incorrect password. Your account was not deleted.",
  user_not_found:
    "We could not find your account. No account changes were made. Sign in again and retry.",
  db_error:
    "We could not update your account data. No account changes were made. Try again in a moment.",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ProfileDataPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const sp = await searchParams;
  const errorText = sp.error ? (errorMessage[sp.error] ?? null) : null;

  return (
    <StudentShell user={session}>
      <main id="main-content" tabIndex={-1} className={styles.page} aria-labelledby="data-title">
        <Link href="/profile" className={styles.backLink}>
          ← Back to profile
        </Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Account settings</span>
          <h1 id="data-title" className={styles.title}>
            Your data
          </h1>
          <p className={styles.intro}>
            Export the learning record attached to your account, or permanently remove your usable
            account credentials.
          </p>
        </header>

        <div className={styles.stack}>
          <section className={styles.section} aria-labelledby="download-data-title">
            <p className={styles.sectionKicker}>Portability</p>
            <h2 id="download-data-title" className={styles.sectionTitle}>
              Download my data
            </h2>
            <p className={styles.help}>
              Get a JSON file with your profile, orders, enrollments, certificates, badges, XP events,
              progress events, quiz attempts, and simulator attempts.
            </p>
            <ExportDataButton className={styles.primary} />
          </section>

          <section className={styles.section} aria-labelledby="delete-account-title">
            <p className={styles.sectionKicker}>Permanent action</p>
            <h2 id="delete-account-title" className={styles.sectionTitle}>
              Delete my account
            </h2>
            <p className={styles.help}>
              This removes your name, email, and login from your account and signs you out everywhere.
              Payment records, certificates, and enrollment history remain for legal and tax
              record-keeping, but are no longer tied to a usable account. This cannot be undone.
            </p>

            {errorText ? (
              <p className={styles.error} role="alert">
                {errorText}
              </p>
            ) : null}

            <form action={deleteAccountAction} className={styles.fields}>
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
                  Confirms it&apos;s really you before we delete anything.
                </span>
              </label>
              <button type="submit" className={styles.danger}>
                Delete my account
              </button>
            </form>
          </section>
        </div>
      </main>
    </StudentShell>
  );
}

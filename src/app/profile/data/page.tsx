/**
 * /profile/data — data export + account deletion.
 *
 * STORY-096. Two sections: "Download my data" (client-triggered JSON
 * export) and a danger-zone "Delete my account" form (requires current
 * password, mirrors DisableTwoFactor's re-confirmation pattern).
 */
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@astryxdesign/core";
import { ExportDataButton } from "@/components/profile/ExportDataButton";
import { deleteAccountAction } from "@/app/actions/deleteAccount.action";
import styles from "../../admin/settings/page.module.css";

const errorMessage: Record<string, string> = {
  wrong_password: "Incorrect password. Your account was not deleted.",
  user_not_found: "Something went wrong. Please try again.",
  db_error: "Something went wrong. Please try again.",
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
      <main style={{ padding: "var(--space-8) var(--side-pad)", maxWidth: 640 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            marginBottom: "var(--space-6)",
          }}
        >
          Your data
        </h1>

        <Card padding={6} style={{ marginBottom: "1.5rem" }}>
          <h2 className={styles.sectionTitle}>Download my data</h2>
          <p className={styles.help}>
            Get a JSON file with your profile, orders, enrollments, certificates, badges, XP events,
            progress events, quiz attempts, and simulator attempts.
          </p>
          <ExportDataButton className={styles.submitButton} />
        </Card>

        <Card padding={6}>
          <h2 className={styles.sectionTitle} style={{ color: "var(--danger)" }}>
            Delete my account
          </h2>
          <p className={styles.help}>
            This removes your name, email, and login from your account and signs you out everywhere.
            Your payment records, certificates, and enrollment history stay in our system for legal
            and tax record-keeping, but are no longer tied to a usable account. This cannot be
            undone.
          </p>

          {errorText && <p className={styles.twoFactorError}>{errorText}</p>}

          <form action={deleteAccountAction} className={styles.twoFactorForm}>
            <label className={styles.field}>
              <span className={styles.label}>Current password</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={styles.input}
                placeholder="********"
              />
              <span className={styles.hint}>
                Confirms it's really you before we delete anything.
              </span>
            </label>
            <button type="submit" className={styles.dangerButton}>
              Delete my account
            </button>
          </form>
        </Card>
      </main>
    </StudentShell>
  );
}

/**
 * /profile — student profile page.
 *
 * Shows the user's profile fields, earned badges, and a link
 * to any public certificate. Reads from the container's
 * userRepo and badgeAwardRepo via the use cases.
 *
 * The /proxy.ts already redirects unauthenticated users away
 * from /profile to /login. The page assumes `getSessionUser()`
 * returns a non-null user.
 */

import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import { StudentShell } from "@/components/student/StudentShell";
import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  const container = buildContainer();
  const badgesResult = await container.listUserBadges.execute({ userId: user.id });
  if (!badgesResult.ok) {
    throw new Error("Failed to load profile badges");
  }
  const badges = badgesResult.value.badges;

  return (
    <StudentShell user={user}>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {user.firstName} {user.lastName}
          </h1>
          <p className={styles.email}>{user.email}</p>
        </header>
        <div className={styles.grid}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Profile</h2>
            <dl className={styles.fields}>
              <Field label="Role" value={user.role} />
              <Field label="Subscription" value={user.subscriptionTier} />
              <Field label="Total XP" value={String(user.totalXp)} mono />
              <Field label="Member since" value={user.createdAt.toISOString().slice(0, 10)} mono />
            </dl>
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Badges</h2>
            {badges.length === 0 ? (
              <p className={styles.empty}>
                No badges yet. Complete a module or simulator to earn one.
              </p>
            ) : (
              <ul className={styles.badgeGrid}>
                {badges.map((b) => (
                  <li key={b.awardId} className={styles.badge} title={b.name}>
                    <span className={styles.badgeDot} />
                    <span className={styles.badgeName}>{b.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div style={{ marginTop: "var(--space-8)", display: "flex", gap: "var(--space-3)" }}>
          <Link href="/reset-password" className="btn btn-ghost">
            Change Password
          </Link>
          <Link href="/profile/security" className="btn btn-ghost">
            Security (2FA)
          </Link>
          <Link href="/profile/data" className="btn btn-ghost">
            Your data
          </Link>
          <Link href="/profile/purchases" className="btn btn-ghost">
            Purchases and refunds
          </Link>
        </div>
      </main>
    </StudentShell>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={`${styles.fieldValue} ${mono ? styles.fieldMono : ""}`}>{value}</dd>
    </div>
  );
}

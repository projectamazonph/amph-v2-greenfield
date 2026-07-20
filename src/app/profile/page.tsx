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
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className={styles.page}>
        <p>Sign in to view your profile.</p>
      </main>
    );
  }

  const container = buildContainer();
  const badgesResult = await container.listUserBadges.execute({ userId: user.id });
  const badges = Result.isOk(badgesResult) ? badgesResult.value.badges : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{user.firstName} {user.lastName}</h1>
        <p className={styles.email}>{user.email}</p>
      </header>
      <div className={styles.grid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <dl className={styles.fields}>
            <Field label="Role" value={user.role} />
            <Field label="Subscription" value={user.subscriptionTier} />
            <Field label="Total XP" value={String(user.totalXp)} mono />
            <Field
              label="Member since"
              value={user.createdAt.toISOString().slice(0, 10)}
              mono
            />
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
    </main>
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

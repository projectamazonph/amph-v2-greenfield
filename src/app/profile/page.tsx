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
import { Flame, Medal, Star, Trophy } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";

// Each badge's iconName is a Phosphor icon name (free entry by admin).
// We map the three seeded slugs to real icons; anything else falls
// back to Medal so the badge still renders a glyph instead of a dot.
const BADGE_ICONS: Record<string, Icon> = {
  Trophy,
  Flame,
  Star,
  Medal,
};

function BadgeIcon({ iconName, slug }: { iconName: string; slug: string }) {
  const IconComponent = BADGE_ICONS[iconName] ?? Medal;
  return <IconComponent className={styles.badgeIcon} weight="duotone" aria-hidden="true" data-slug={slug} />;
}

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
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Student account</span>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.identityName}>
            {user.firstName} {user.lastName}
          </p>
          <p className={styles.email}>{user.email}</p>
        </header>
        <div className={styles.grid}>
          <section className={styles.section} aria-labelledby="profile-details-title">
            <h2 id="profile-details-title" className={styles.sectionTitle}>Account details</h2>
            <dl className={styles.fields}>
              <Field label="Role" value={user.role} />
              <Field label="Subscription" value={user.subscriptionTier} />
              <Field label="Total XP" value={String(user.totalXp)} mono />
              <Field label="Member since" value={user.createdAt.toISOString().slice(0, 10)} mono />
            </dl>
          </section>
          <section className={styles.section} aria-labelledby="profile-badges-title">
            <h2 id="profile-badges-title" className={styles.sectionTitle}>Badges</h2>
            {badges.length === 0 ? (
              <p className={styles.empty}>
                No badges yet. Complete a module or simulator to earn one.
              </p>
            ) : (
              <ul className={styles.badgeGrid}>
                {badges.map((b) => (
                  <li key={b.awardId} className={styles.badge} title={b.description}>
                    <BadgeIcon iconName={b.iconName} slug={b.slug} />
                    <span className={styles.badgeName}>{b.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <nav className={styles.actions} aria-label="Profile settings">
          <Link href="/reset-password" className={styles.btnGhost}>
            Change password <span aria-hidden="true">→</span>
          </Link>
          <Link href="/profile/security" className={styles.btnGhost}>
            Security (2FA) <span aria-hidden="true">→</span>
          </Link>
          <Link href="/profile/data" className={styles.btnGhost}>
            Your data <span aria-hidden="true">→</span>
          </Link>
          <Link href="/profile/purchases" className={styles.btnGhost}>
            Purchases and refunds <span aria-hidden="true">→</span>
          </Link>
        </nav>
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

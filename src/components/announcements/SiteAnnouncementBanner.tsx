/**
 * SiteAnnouncementBanner — server component rendered at the root of every page.
 *
 * P1-07 (P4 PR-A). Calls GetActiveAnnouncementsForUser, which already
 * filters by visibility, dismissal, and opt-out. Anonymous visitors
 * pass userId=null and rely on the SessionDismissGate child for
 * per-session dismissal in sessionStorage.
 */

import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { AnnouncementItem } from "./AnnouncementItem";
import styles from "./SiteAnnouncementBanner.module.css";

export const dynamic = "force-dynamic";

export async function SiteAnnouncementBanner() {
  const user = await getSessionUser();
  const container = buildContainer();
  const result = await container.getActiveAnnouncementsForUser.execute({
    userId: user?.id ?? null,
  });
  if (!result.ok || result.value.length === 0) return null;

  const isLoggedIn = user !== null;

  return (
    <div className={styles.stack} aria-label="Site announcements">
      {result.value.map((a) => (
        <AnnouncementItem
          key={a.id}
          id={a.id}
          title={a.title}
          body={a.body}
          level={a.level}
          dismissible={a.dismissible}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  );
}

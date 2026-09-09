/**
 * AnnouncementItem — one banner row inside the SiteAnnouncementBanner stack.
 *
 * P1-07 (P4 PR-A). Server component renders the visible chrome; the
 * dismiss button is a tiny client island (SessionDismissGate) that
 * hides the row after dismissal.
 */

import { Info, Warning, X } from "@phosphor-icons/react/dist/ssr";
import { SessionDismissGate } from "./SessionDismissGate";
import styles from "./SiteAnnouncementBanner.module.css";

const ICONS = {
  INFO: Info,
  WARNING: Warning,
  CRITICAL: Warning,
} as const;

export function AnnouncementItem({
  id,
  title,
  body,
  level,
  dismissible,
  isLoggedIn,
}: {
  id: string;
  title: string;
  body: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  dismissible: boolean;
  isLoggedIn: boolean;
}) {
  const Icon = ICONS[level];
  return (
    <div
      className={`${styles.banner} ${styles[`banner_${level}`]}`}
      data-announcement-id={id}
    >
      <span className={styles.icon} aria-hidden>
        <Icon size={18} weight="regular" />
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{body}</p>
      </div>
      {dismissible ? (
        <SessionDismissGate announcementId={id} isLoggedIn={isLoggedIn} />
      ) : null}
    </div>
  );
}
